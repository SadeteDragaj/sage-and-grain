"""Sage & Grain content API.

Run:  uvicorn app.main:app --reload --port 8190
Docs: http://127.0.0.1:8190/docs   Admin: http://127.0.0.1:8190/admin
"""

from __future__ import annotations

import json
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import admin, config
from .content import (
    DATA_DIR,
    filter_recipes,
    get_category,
    get_recipe,
    in_category,
    load_categories,
    load_recipes,
    paginate,
)
from .seo import recipe_json_ld

app = FastAPI(title="Sage & Grain API", version="0.1.0")
admin.install(app)  # local recipe admin at /admin
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def summary(r) -> dict:
    return r.model_dump(
        mode="json",
        include={
            "slug", "title", "description", "image", "meal", "diets", "diet_options",
            "collections", "difficulty", "total_minutes", "extra_time", "popularity",
            "date_published",
        },
    )


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "recipes": len(load_recipes())}


@app.get("/api/site")
def site() -> dict:
    return json.loads((DATA_DIR / "site.json").read_text(encoding="utf-8"))


@app.get("/api/recipes")
def list_recipes(
    diet: list[str] = Query(default=[]),
    meal: list[str] = Query(default=[]),
    time: Literal[15, 30, 60] | None = None,
    difficulty: list[str] = Query(default=[]),
    collection: str | None = None,
    q: str | None = None,
    gf_options: bool = True,
    sort: Literal["newest", "popular", "quickest"] = "newest",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=9, ge=1, le=50),
) -> dict:
    items = filter_recipes(
        load_recipes(),
        diets=diet,
        meals=meal,
        max_minutes=time,
        difficulties=difficulty,
        collection=collection,
        query=q,
        include_options=gf_options,
        sort=sort,
    )
    page_items, pages = paginate(items, page, per_page)
    return {
        "total": len(items),
        "page": min(page, pages),
        "pages": pages,
        "items": [summary(r) for r in page_items],
    }


@app.get("/api/recipes/{slug}")
def recipe_detail(slug: str) -> dict:
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    data = recipe.model_dump(mode="json")
    data["json_ld"] = recipe_json_ld(recipe, config.SITE_URL)
    return data


@app.get("/api/categories")
def list_categories() -> list[dict]:
    return [c.model_dump(mode="json", include={"slug", "name", "h1"}) for c in load_categories()]


@app.get("/api/categories/{slug}")
def category_detail(slug: str) -> dict:
    category = get_category(slug)
    if not category:
        raise HTTPException(404, "Category not found")
    recipes = [r for r in load_recipes() if in_category(r, category, include_options=False)]
    return {**category.model_dump(mode="json"), "recipes": [summary(r) for r in recipes]}
