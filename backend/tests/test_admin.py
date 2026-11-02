"""Admin API tests. They run against a temporary copy of the data and frontend folders."""

import io
import json
import shutil

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import admin, config, content, export
from app.main import app

H = {"X-Sage-Admin": "1"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    data = tmp_path / "data"
    shutil.copytree(content.DATA_DIR, data, ignore=shutil.ignore_patterns("backups"))
    frontend = tmp_path / "frontend"
    monkeypatch.setattr(content, "DATA_DIR", data)
    monkeypatch.setattr(export, "DATA_DIR", data)
    monkeypatch.setattr(admin, "RECIPES_FILE", data / "recipes.json")
    monkeypatch.setattr(admin, "SITE_FILE", data / "site.json")
    monkeypatch.setattr(admin, "BACKUP_DIR", data / "backups")
    monkeypatch.setattr(config, "FRONTEND_DIR", frontend)
    monkeypatch.setattr(config, "IMAGES_DIR", frontend / "public" / "images" / "recipes")
    content.load_recipes.cache_clear()
    yield TestClient(app)
    content.load_recipes.cache_clear()
    content.load_categories.cache_clear()


def curry(c: TestClient) -> dict:
    return c.get("/api/admin/recipes/vegan-chickpea-curry").json()


def test_list_shows_completeness(client):
    rows = client.get("/api/admin/recipes").json()
    assert len(rows) == 10
    row = next(r for r in rows if r["slug"] == "vegan-chickpea-curry")
    assert row["article_done"] == row["article_total"]
    assert row["cooking_hints"] is True


def test_create_saves_exports_and_backs_up(client):
    new = {**curry(client), "slug": "chickpea-curry-two", "title": "Chickpea Curry Two"}
    r = client.post("/api/admin/recipes", json=new, headers=H)
    assert r.status_code == 201, r.text
    stored = json.loads(admin.RECIPES_FILE.read_text())
    assert stored[-1]["slug"] == "chickpea-curry-two"
    assert "unit" not in stored[-1]["ingredients"][1]  # defaults left out of the file
    exported = json.loads((config.FRONTEND_DIR / "src/content/recipes.json").read_text())
    assert any(x["slug"] == "chickpea-curry-two" for x in exported)
    assert list(admin.BACKUP_DIR.glob("recipes-*.json"))


def test_duplicate_address_is_refused(client):
    r = client.post("/api/admin/recipes", json=curry(client), headers=H)
    assert r.status_code == 409


def test_diet_rules_apply(client):
    bad = curry(client)
    bad["ingredients"].append({"item": "plain flour", "contains": ["gluten"]})
    r = client.put("/api/admin/recipes/vegan-chickpea-curry", json=bad, headers=H)
    assert r.status_code == 422
    assert "gluten-free" in r.json()["detail"]["errors"][0]["msg"]
    assert not r.json()["detail"]["errors"][0]["msg"].startswith("Value error")


def test_blank_ingredient_is_refused(client):
    bad = curry(client)
    bad["ingredients"].append({"item": ""})
    r = client.post("/api/admin/validate", json=bad, headers=H)
    assert r.status_code == 422
    assert r.json()["detail"]["errors"][0]["loc"][:2] == ["ingredients", "14"]


def test_rename_updates_homepage_picks(client):
    data = {**curry(client), "slug": "easy-chickpea-curry"}
    r = client.put("/api/admin/recipes/vegan-chickpea-curry", json=data, headers=H)
    assert r.status_code == 200, r.text
    site = json.loads(admin.SITE_FILE.read_text())
    assert "easy-chickpea-curry" in site["featured"]
    assert "vegan-chickpea-curry" not in site["seasonal"]["recipes"]


def test_delete(client):
    assert client.delete("/api/admin/recipes/vegan-chickpea-curry", headers=H).status_code == 409  # on the homepage
    assert client.delete("/api/admin/recipes/healthy-avocado-toast", headers=H).status_code == 200
    assert len(client.get("/api/admin/recipes").json()) == 9


def test_changes_need_the_admin_header(client):
    assert client.delete("/api/admin/recipes/healthy-avocado-toast").status_code == 403
    assert client.get("/api/admin/recipes").status_code == 200


def test_photo_upload_makes_three_crops(client):
    buf = io.BytesIO()
    Image.new("RGB", (2400, 1800), "orange").save(buf, "JPEG")
    r = client.post(
        "/api/admin/photos/vegan-chickpea-curry",
        files={"file": ("dish.jpg", buf.getvalue(), "image/jpeg")},
        headers=H,
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"src": "/images/recipes/vegan-chickpea-curry", "warnings": []}
    sizes = {name: Image.open(config.IMAGES_DIR / f"vegan-chickpea-curry-{name}.jpg").size for name in admin.CROPS}
    assert sizes == {"16x9": (1600, 900), "4x3": (1200, 900), "1x1": (1200, 1200)}


def test_photo_upload_rejects_non_images(client):
    r = client.post("/api/admin/photos/x", files={"file": ("a.txt", b"hello", "text/plain")}, headers=H)
    assert r.status_code == 400


def test_admin_page_is_served(client):
    r = client.get("/admin/")
    assert r.status_code == 200
    assert "Recipe admin" in r.text


def test_article_html_is_cleaned_on_save(client):
    data = curry(client)
    data["article_html"] = (
        '<h1>Title</h1><p onclick="x()">Hi&nbsp;there<script>alert(1)</script></p>'
        '<img src="https://evil.example/x.jpg"><img src="/images/articles/a.jpg" alt="A">'
        '<a href="javascript:alert(1)">bad</a><p><br></p>'
    )
    assert client.put("/api/admin/recipes/vegan-chickpea-curry", json=data, headers=H).status_code == 200
    saved = curry(client)["article_html"]
    assert saved.startswith("<h2>Title</h2><p>Hi there</p><img ")
    assert saved.endswith("<a>bad</a>")
    for bit in ('src="/images/articles/a.jpg"', 'alt="A"', 'loading="lazy"'):
        assert bit in saved
    for bad in ("script", "onclick", "evil.example", "javascript", "<p><br></p>", "<h1>"):
        assert bad not in saved


def test_template_placeholders_block_saving(client):
    data = curry(client)
    data["article_html"] = "<h2>About this recipe</h2><p>[What it is, who it’s for]</p>"
    r = client.put("/api/admin/recipes/vegan-chickpea-curry", json=data, headers=H)
    assert r.status_code == 422
    assert "example text" in r.json()["detail"]["errors"][0]["msg"]


def test_article_photo_upload(client):
    buf = io.BytesIO()
    Image.new("RGBA", (2000, 1000), (255, 0, 0, 0)).save(buf, "PNG")
    r = client.post(
        "/api/admin/article-photos/vegan-chickpea-curry",
        files={"file": ("step.png", buf.getvalue(), "image/png")},
        headers=H,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["src"].startswith("/images/articles/vegan-chickpea-curry-")
    assert (body["width"], body["height"]) == (1360, 680)
    saved = Image.open(config.IMAGES_DIR.parent / "articles" / body["src"].rsplit("/", 1)[1])
    assert saved.getpixel((10, 10)) == (255, 255, 255)  # transparency flattened onto white
