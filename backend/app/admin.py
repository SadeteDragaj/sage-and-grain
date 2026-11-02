"""Local recipe admin: a form for adding and editing recipes.

Open http://127.0.0.1:8190/admin while the API runs (`npm run admin` in frontend/).

Every save goes through the same ``Recipe`` model as the export, so the diet-label
rules apply here too. After a save the content is re-exported, so the dev site
(`npm run dev`) shows the change straight away.

This is for your own computer only: requests from other machines are refused, and
every change needs the ``X-Sage-Admin`` header, which a web page on another site
can't send without a CORS preflight this API never approves.
"""

from __future__ import annotations

import io
import json
import os
import secrets
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image as PILImage
from PIL import ImageOps, UnidentifiedImageError
from pydantic import ValidationError

from . import config
from .content import DATA_DIR, load_recipes
from .export import run_export
from .models import DIET_BLOCKERS, DIET_LABELS, MEAL_LABELS, Recipe, check_slug
from .richtext import image_count, word_count

RECIPES_FILE = DATA_DIR / "recipes.json"
SITE_FILE = DATA_DIR / "site.json"
BACKUP_DIR = DATA_DIR / "backups"
KEEP_BACKUPS = 30
ADMIN_DIR = Path(__file__).parent / "admin_ui"

LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}
ADMIN_HEADER = "x-sage-admin"

# Google uses all three crops. Width × height of each saved file (never upscaled).
CROPS = {"16x9": (1600, 900), "4x3": (1200, 900), "1x1": (1200, 1200)}
MIN_CROP_WIDTH = 1200
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
# Photos inside the article: the reading column is 680px, so 1360px covers 2× screens.
ARTICLE_IMAGE_WIDTH = 1360
ARTICLE_MIN_WORDS = 200

router = APIRouter(prefix="/api/admin")


# ---------- Storage ----------


def _compact_json(value, indent: int = 0) -> str:
    """JSON that keeps short objects on one line, like the hand-written file."""
    flat = json.dumps(value, ensure_ascii=False)
    if len(flat) + indent <= 110 or not isinstance(value, (dict, list)) or not value:
        return flat
    pad = " " * (indent + 2)
    if isinstance(value, dict):
        items = [f"{pad}{json.dumps(k)}: {_compact_json(v, indent + 2)}" for k, v in value.items()]
        return "{\n" + ",\n".join(items) + "\n" + " " * indent + "}"
    items = [pad + _compact_json(v, indent + 2) for v in value]
    return "[\n" + ",\n".join(items) + "\n" + " " * indent + "]"


def _write_atomic(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def _backup() -> None:
    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    shutil.copy2(RECIPES_FILE, BACKUP_DIR / f"recipes-{stamp}.json")
    for old in sorted(BACKUP_DIR.glob("recipes-*.json"))[:-KEEP_BACKUPS]:
        old.unlink()


def read_rows() -> list[dict]:
    return json.loads(RECIPES_FILE.read_text(encoding="utf-8"))


def write_rows(rows: list[dict]) -> None:
    _backup()
    _write_atomic(RECIPES_FILE, _compact_json(rows) + "\n")
    load_recipes.cache_clear()


def stored_form(recipe: Recipe) -> dict:
    """What goes in recipes.json: defaults left out so the file stays readable."""
    return recipe.model_dump(mode="json", exclude_defaults=True, exclude={"total_minutes"})


def full_form(recipe: Recipe) -> dict:
    """What the editor receives: every field, defaults filled in."""
    return recipe.model_dump(mode="json", exclude={"total_minutes"})


def read_site() -> dict:
    return json.loads(SITE_FILE.read_text(encoding="utf-8"))


def site_references(slug: str) -> list[str]:
    site = read_site()
    places = []
    if slug in site.get("featured", []):
        places.append("Featured recipes on the homepage")
    if slug in site.get("seasonal", {}).get("recipes", []):
        places.append("Ingredient of the month on the homepage")
    return places


def rename_in_site(old: str, new: str) -> None:
    site = read_site()
    site["featured"] = [new if s == old else s for s in site.get("featured", [])]
    seasonal = site.get("seasonal", {})
    seasonal["recipes"] = [new if s == old else s for s in seasonal.get("recipes", [])]
    _write_atomic(SITE_FILE, json.dumps(site, ensure_ascii=False, indent=2) + "\n")


# ---------- Validation ----------


def readable_errors(exc: ValidationError) -> list[dict]:
    out = []
    for err in exc.errors():
        msg = err["msg"].removeprefix("Value error, ")
        out.append({"loc": [str(part) for part in err["loc"]], "msg": msg})
    return out


def validate(data: dict) -> Recipe:
    try:
        return Recipe.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, {"errors": readable_errors(exc)}) from exc


def save_and_export(rows: list[dict]) -> str:
    write_rows(rows)
    return run_export()


# ---------- Routes ----------


@router.get("/meta")
def meta() -> dict:
    collections = sorted({c for r in load_recipes() for c in r.collections})
    return {
        "diets": DIET_LABELS,
        "meals": MEAL_LABELS,
        "difficulties": {"easy": "Easy", "medium": "Medium", "advanced": "Advanced"},
        "flags": ["gluten", "dairy", "egg", "meat", "fish", "honey"],
        "diet_blockers": {k: sorted(v) for k, v in DIET_BLOCKERS.items()},
        "collections": collections,
        "dev_site_url": config.DEV_SITE_URL,
        "today": datetime.now().date().isoformat(),
    }


def _completeness(r: Recipe) -> dict:
    words = word_count(r.article_html)
    sections = {
        f"Article ({ARTICLE_MIN_WORDS}+ words)": words >= ARTICLE_MIN_WORDS,
        "Storage": bool(r.storage),
        "FAQ": bool(r.faq),
    }
    return {
        "photo": bool(r.image.src),
        "words": words,
        "article_images": image_count(r.article_html),
        "article_done": sum(sections.values()),
        "article_total": len(sections),
        "missing": [name for name, done in sections.items() if not done],
        "cooking_hints": any(s.uses or s.tip for s in r.steps),
    }


@router.get("/recipes")
def list_recipes() -> list[dict]:
    load_recipes.cache_clear()
    return [
        {
            "slug": r.slug,
            "title": r.title,
            "meal": r.meal,
            "diets": r.diets,
            "diet_options": r.diet_options,
            "date_modified": r.date_modified.isoformat(),
            **_completeness(r),
        }
        for r in sorted(load_recipes(), key=lambda r: r.date_modified, reverse=True)
    ]


@router.get("/recipes/{slug}")
def get_recipe(slug: str) -> dict:
    load_recipes.cache_clear()
    recipe = next((r for r in load_recipes() if r.slug == slug), None)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    return full_form(recipe)


@router.post("/validate")
def check(data: dict) -> dict:
    validate(data)
    return {"ok": True}


@router.post("/recipes", status_code=201)
def create_recipe(data: dict) -> dict:
    recipe = validate(data)
    rows = read_rows()
    if any(r["slug"] == recipe.slug for r in rows):
        raise HTTPException(409, f"A recipe with the address /recipes/{recipe.slug} already exists.")
    rows.append(stored_form(recipe))
    return {"slug": recipe.slug, "export": save_and_export(rows)}


@router.put("/recipes/{slug}")
def update_recipe(slug: str, data: dict) -> dict:
    recipe = validate(data)
    rows = read_rows()
    index = next((i for i, r in enumerate(rows) if r["slug"] == slug), None)
    if index is None:
        raise HTTPException(404, "Recipe not found")
    renamed = recipe.slug != slug
    if renamed and any(r["slug"] == recipe.slug for r in rows):
        raise HTTPException(409, f"A recipe with the address /recipes/{recipe.slug} already exists.")

    if renamed:
        # Keep photos and homepage picks pointing at the recipe.
        old_stem = f"/images/recipes/{slug}"
        if recipe.image.src == old_stem:
            for name in CROPS:
                old_file = config.IMAGES_DIR / f"{slug}-{name}.jpg"
                if old_file.exists():
                    old_file.rename(config.IMAGES_DIR / f"{recipe.slug}-{name}.jpg")
            recipe.image.src = f"/images/recipes/{recipe.slug}"
        rename_in_site(slug, recipe.slug)

    rows[index] = stored_form(recipe)
    return {"slug": recipe.slug, "export": save_and_export(rows)}


@router.delete("/recipes/{slug}")
def delete_recipe(slug: str) -> dict:
    rows = read_rows()
    if not any(r["slug"] == slug for r in rows):
        raise HTTPException(404, "Recipe not found")
    places = site_references(slug)
    if places:
        raise HTTPException(
            409,
            "This recipe is used in: " + "; ".join(places) + ". Remove it there (backend/app/data/site.json) first.",
        )
    rows = [r for r in rows if r["slug"] != slug]
    return {"export": save_and_export(rows)}


def _open_photo(data: bytes) -> PILImage.Image:
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "That photo is over 25 MB. Export a smaller JPEG and try again.")
    try:
        img = ImageOps.exif_transpose(PILImage.open(io.BytesIO(data)))
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(400, "That file isn't a photo this tool can read. Use a JPEG, PNG or WebP.") from exc
    if img.mode in ("RGBA", "LA", "P"):
        # Flatten transparency onto white rather than black.
        img = img.convert("RGBA")
        background = PILImage.new("RGB", img.size, "white")
        background.paste(img, mask=img.split()[-1])
        return background
    return img.convert("RGB")


def _crop(img: PILImage.Image, ratio_w: int, ratio_h: int) -> PILImage.Image:
    """Centre crop to the ratio (keep the dish centred so every crop works)."""
    w, h = img.size
    target = ratio_w / ratio_h
    if w / h > target:
        new_w = round(h * target)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    new_h = round(w / target)
    top = (h - new_h) // 2
    return img.crop((0, top, w, top + new_h))


@router.post("/photos/{slug}")
async def upload_photo(slug: str, file: UploadFile = File(...)) -> dict:
    try:
        check_slug(slug)
    except ValueError as exc:
        raise HTTPException(400, f"Fix the recipe address first: {exc}") from exc

    img = _open_photo(await file.read(MAX_UPLOAD_BYTES + 1))

    config.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    warnings = []
    for name, (max_w, max_h) in CROPS.items():
        ratio_w, ratio_h = (int(n) for n in name.split("x"))
        cropped = _crop(img, ratio_w, ratio_h)
        if cropped.width > max_w:
            cropped = cropped.resize((max_w, max_h), PILImage.LANCZOS)
        elif cropped.width < MIN_CROP_WIDTH:
            warnings.append(
                f"The {name.replace('x', ':')} crop is only {cropped.width}px wide; "
                f"Google prefers at least {MIN_CROP_WIDTH}px."
            )
        cropped.save(config.IMAGES_DIR / f"{slug}-{name}.jpg", "JPEG", quality=85, optimize=True, progressive=True)

    return {"src": f"/images/recipes/{slug}", "warnings": warnings}


@router.post("/article-photos/{slug}")
async def upload_article_photo(slug: str, file: UploadFile = File(...)) -> dict:
    """A photo placed inside the article (process shots, finished dish…)."""
    try:
        check_slug(slug)
    except ValueError as exc:
        raise HTTPException(400, f"Fix the recipe address first: {exc}") from exc
    img = _open_photo(await file.read(MAX_UPLOAD_BYTES + 1))
    if img.width > ARTICLE_IMAGE_WIDTH:
        img = img.resize((ARTICLE_IMAGE_WIDTH, round(img.height * ARTICLE_IMAGE_WIDTH / img.width)), PILImage.LANCZOS)

    folder = config.IMAGES_DIR.parent / "articles"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{slug}-{secrets.token_hex(4)}.jpg"
    img.save(folder / name, "JPEG", quality=85, optimize=True, progressive=True)
    warnings = []
    if img.width < 680:
        warnings.append(f"This photo is only {img.width}px wide, so it will look soft in the article. 1360px or more is best.")
    return {"src": f"/images/articles/{name}", "width": img.width, "height": img.height, "warnings": warnings}


@router.post("/export")
def export_now() -> dict:
    return {"export": run_export()}


# ---------- Wiring ----------


def install(app: FastAPI) -> None:
    """Add the admin API, its page at /admin and photo previews at /images (frontend/public/images)."""

    @app.middleware("http")
    async def local_only(request: Request, call_next):
        path = request.url.path
        if path.startswith(("/admin", "/api/admin", "/images")):
            host = request.client.host if request.client else ""
            if host not in LOCAL_HOSTS:
                return JSONResponse({"detail": "The admin only works on this computer."}, status_code=403)
            if request.method not in ("GET", "HEAD") and request.headers.get(ADMIN_HEADER) != "1":
                return JSONResponse({"detail": "Missing admin header."}, status_code=403)
        return await call_next(request)

    app.include_router(router)
    app.mount("/admin", StaticFiles(directory=ADMIN_DIR, html=True), name="admin")
    config.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/images", StaticFiles(directory=config.IMAGES_DIR.parent), name="images")
