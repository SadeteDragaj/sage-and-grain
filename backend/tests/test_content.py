import copy
import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.content import DATA_DIR, filter_recipes, load_categories, load_recipes
from app.main import app
from app.models import Recipe
from app.seo import format_qty, iso_minutes, recipe_json_ld

client = TestClient(app)
RAW = json.loads((DATA_DIR / "recipes.json").read_text(encoding="utf-8"))


def raw(slug: str) -> dict:
    return copy.deepcopy(next(r for r in RAW if r["slug"] == slug))


def test_all_content_loads():
    assert len(load_recipes()) == 10
    assert len(load_categories()) == 7


def test_gf_tag_rejected_when_an_ingredient_has_gluten():
    data = raw("vegan-chickpea-curry")
    data["ingredients"].append({"item": "flour", "contains": ["gluten"]})
    with pytest.raises(ValidationError, match="gluten-free"):
        Recipe.model_validate(data)


def test_plain_oats_cannot_be_gluten_free():
    data = raw("gluten-free-banana-oat-pancakes")
    data["ingredients"][1]["item"] = "rolled oats"
    with pytest.raises(ValidationError, match="certified"):
        Recipe.model_validate(data)


def test_gf_option_requires_a_swap():
    data = raw("healthy-avocado-toast")
    data["ingredients"][0]["gf_swap"] = None
    with pytest.raises(ValidationError, match="gf_swap"):
        Recipe.model_validate(data)


def test_vegan_rejects_dairy():
    data = raw("vegan-red-lentil-soup")
    data["ingredients"].append({"item": "butter", "contains": ["dairy"]})
    with pytest.raises(ValidationError, match="vegan"):
        Recipe.model_validate(data)


def test_step_uses_must_point_at_real_ingredients():
    data = raw("vegan-chickpea-curry")
    data["steps"][0]["uses"] = [99]
    with pytest.raises(ValidationError, match="don't exist"):
        Recipe.model_validate(data)


def test_timer_done_needs_a_timer():
    data = raw("vegan-chickpea-curry")
    data["steps"][2]["timer_done"] = "Done?"
    with pytest.raises(ValidationError, match="no timer"):
        Recipe.model_validate(data)


def test_filters():
    recipes = load_recipes()
    vegan_easy = filter_recipes(recipes, diets=["vegan"], difficulties=["easy"])
    assert len(vegan_easy) == 6
    strict_gf_snacks = filter_recipes(recipes, diets=["gluten-free"], meals=["snack"], include_options=False)
    assert strict_gf_snacks == []
    assert len(filter_recipes(recipes, query="chickpeas")) == 3
    quickest = filter_recipes(recipes, sort="quickest")
    assert quickest[0].total_minutes <= quickest[-1].total_minutes


def test_formatting():
    assert format_qty(0.5) == "½"
    assert format_qty(1.25) == "1¼"
    assert iso_minutes(35) == "PT35M"
    assert iso_minutes(60) == "PT1H"


def test_json_ld_has_required_fields():
    ld = recipe_json_ld(load_recipes()[0], "https://example.com")
    for key in ("name", "image", "author", "datePublished", "recipeIngredient", "recipeInstructions", "totalTime"):
        assert ld[key]
    assert "aggregateRating" not in ld


def test_api():
    r = client.get("/api/recipes", params={"diet": "vegan", "difficulty": "easy"})
    assert r.status_code == 200
    assert r.json()["total"] == 6
    assert client.get("/api/recipes/vegan-chickpea-curry").json()["json_ld"]["@type"] == "Recipe"
    assert client.get("/api/recipes/nope").status_code == 404
    assert len(client.get("/api/categories/vegan").json()["recipes"]) == 7
