"""Structured data and sitemap generation.

Everything marked up here is also visible on the page (Google requires that):
title, image, description, author, dates, times, servings, ingredients,
instructions, category, cuisine and diet.
"""

from __future__ import annotations

from datetime import date
from xml.sax.saxutils import escape

from .models import DIET_LABELS, MEAL_LABELS, Category, Ingredient, Recipe

SCHEMA_DIETS = {
    "gluten-free": "https://schema.org/GlutenFreeDiet",
    "vegan": "https://schema.org/VeganDiet",
    "vegetarian": "https://schema.org/VegetarianDiet",
}

STATIC_PAGES = ["/", "/recipes", "/about", "/contact", "/privacy", "/cookies", "/terms"]

FRACTIONS = {0.25: "¼", 0.33: "⅓", 0.5: "½", 0.67: "⅔", 0.75: "¾"}


def format_qty(qty: float) -> str:
    whole = int(qty)
    frac = round(qty - whole, 2)
    if frac == 0:
        return str(whole)
    symbol = FRACTIONS.get(frac)
    if symbol is None:
        return f"{qty:g}"
    return f"{whole}{symbol}" if whole else symbol


def ingredient_text(ing: Ingredient) -> str:
    parts = []
    if ing.qty is not None:
        parts.append(format_qty(ing.qty))
    if ing.unit:
        parts.append(ing.unit)
    parts.append(ing.item)
    text = " ".join(parts)
    return f"{text}, {ing.note}" if ing.note else text


def iso_minutes(minutes: int) -> str:
    hours, mins = divmod(minutes, 60)
    return "PT" + (f"{hours}H" if hours else "") + (f"{mins}M" if mins or not hours else "")


def image_urls(recipe: Recipe, site_url: str) -> list[str]:
    """Google wants 16:9, 4:3 and 1:1 crops. Upload them with these names."""
    stem = recipe.image.src or f"/images/recipes/{recipe.slug}"
    return [f"{site_url}{stem}-{ratio}.jpg" for ratio in ("16x9", "4x3", "1x1")]


def recipe_json_ld(recipe: Recipe, site_url: str) -> dict:
    url = f"{site_url}/recipes/{recipe.slug}"
    data: dict = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": recipe.title,
        "description": recipe.intro,
        "image": image_urls(recipe, site_url),
        "author": {"@type": "Person", "name": recipe.author, "url": f"{site_url}/about"},
        "datePublished": recipe.date_published.isoformat(),
        "dateModified": recipe.date_modified.isoformat(),
        "prepTime": iso_minutes(recipe.prep_minutes),
        "cookTime": iso_minutes(recipe.cook_minutes),
        "totalTime": iso_minutes(recipe.total_minutes),
        "recipeYield": f"{recipe.servings} {recipe.yield_label}",
        "recipeCategory": MEAL_LABELS[recipe.meal],
        "recipeCuisine": recipe.cuisine,
        "keywords": ", ".join([recipe.title.lower()] + [DIET_LABELS[d].lower() for d in recipe.diets]),
        "recipeIngredient": [ingredient_text(i) for i in recipe.ingredients],
        "recipeInstructions": [
            {
                "@type": "HowToStep",
                "position": n,
                "text": step.text,
                "url": f"{url}#step-{n}",
            }
            for n, step in enumerate(recipe.steps, start=1)
        ],
        "url": url,
    }
    diets = [SCHEMA_DIETS[d] for d in recipe.diets if d in SCHEMA_DIETS]
    if diets:
        data["suitableForDiet"] = diets
    # No aggregateRating: the site has no real reviews in v1.
    return data


def breadcrumb_json_ld(items: list[tuple[str, str]], site_url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": n, "name": name, "item": f"{site_url}{path}"}
            for n, (name, path) in enumerate(items, start=1)
        ],
    }


def sitemap_xml(recipes: list[Recipe], categories: list[Category], site_url: str) -> str:
    today = date.today().isoformat()
    rows = [(path, today) for path in STATIC_PAGES]
    rows += [(f"/{c.slug}", today) for c in categories]
    rows += [(f"/recipes/{r.slug}", r.date_modified.isoformat()) for r in recipes]
    body = "\n".join(
        f"  <url><loc>{escape(site_url + path)}</loc><lastmod>{lastmod}</lastmod></url>"
        for path, lastmod in rows
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n</urlset>\n"
    )


def robots_txt(site_url: str) -> str:
    return f"User-agent: *\nAllow: /\n\nSitemap: {site_url}/sitemap.xml\n"
