"""Loading and querying recipe content.

Recipes live in ``app/data/*.json`` for now. Swap ``load_recipes`` for a database
later without touching the API or the export.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Literal

from .models import Category, Recipe

DATA_DIR = Path(__file__).parent / "data"

Sort = Literal["newest", "popular", "quickest"]


@lru_cache
def load_recipes() -> tuple[Recipe, ...]:
    raw = json.loads((DATA_DIR / "recipes.json").read_text(encoding="utf-8"))
    recipes = tuple(Recipe.model_validate(r) for r in raw)
    slugs = [r.slug for r in recipes]
    if len(slugs) != len(set(slugs)):
        raise ValueError("duplicate recipe slugs")
    return recipes


@lru_cache
def load_categories() -> tuple[Category, ...]:
    raw = json.loads((DATA_DIR / "categories.json").read_text(encoding="utf-8"))
    return tuple(Category.model_validate(c) for c in raw)


def get_recipe(slug: str) -> Recipe | None:
    return next((r for r in load_recipes() if r.slug == slug), None)


def get_category(slug: str) -> Category | None:
    return next((c for c in load_categories() if c.slug == slug), None)


def matches_diet(recipe: Recipe, diet: str, include_options: bool) -> bool:
    if diet in recipe.diets:
        return True
    # Every vegan recipe is also vegetarian.
    if diet == "vegetarian" and "vegan" in recipe.diets:
        return True
    return include_options and diet in recipe.diet_options


def in_category(recipe: Recipe, category: Category, include_options: bool = False) -> bool:
    if category.match_diet:
        return matches_diet(recipe, category.match_diet, include_options)
    if category.match_meals:
        return recipe.meal in category.match_meals
    return bool(category.match_collection and category.match_collection in recipe.collections)


def filter_recipes(
    recipes: Iterable[Recipe],
    *,
    diets: list[str] | None = None,
    meals: list[str] | None = None,
    max_minutes: int | None = None,
    difficulties: list[str] | None = None,
    collection: str | None = None,
    query: str | None = None,
    include_options: bool = True,
    sort: Sort = "newest",
) -> list[Recipe]:
    """Diets combine with AND; meals and difficulties with OR."""
    q = (query or "").strip().lower()
    out = []
    for r in recipes:
        if diets and not all(matches_diet(r, d, include_options) for d in diets):
            continue
        if meals and r.meal not in meals:
            continue
        if max_minutes is not None and r.total_minutes > max_minutes:
            continue
        if difficulties and r.difficulty not in difficulties:
            continue
        if collection and collection not in r.collections:
            continue
        if q:
            haystack = " ".join([r.title, r.description] + [i.item for i in r.ingredients]).lower()
            if q not in haystack:
                continue
        out.append(r)

    if sort == "popular":
        out.sort(key=lambda r: r.popularity)
    elif sort == "quickest":
        out.sort(key=lambda r: (r.total_minutes, r.title))
    else:
        out.sort(key=lambda r: r.date_published, reverse=True)
    return out


def paginate(items: list, page: int, per_page: int) -> tuple[list, int]:
    pages = max(1, math.ceil(len(items) / per_page))
    page = min(max(1, page), pages)
    start = (page - 1) * per_page
    return items[start : start + per_page], pages
