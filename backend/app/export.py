"""Export content for the static frontend build.

    python -m app.export

Writes:
  frontend/src/content/recipes.json     every recipe, validated, with JSON-LD
  frontend/src/content/categories.json  category pages
  frontend/src/content/site.json        homepage config + site URL
  frontend/public/sitemap.xml
  frontend/public/robots.txt
"""

from __future__ import annotations

import json

from . import config
from .content import DATA_DIR, in_category, load_categories, load_recipes
from .seo import robots_txt, recipe_json_ld, sitemap_xml


def run_export() -> str:
    """Write every output file and return a one-line summary."""
    load_recipes.cache_clear()
    load_categories.cache_clear()
    recipes = list(load_recipes())  # validation (diet-tag rules) runs here
    categories = list(load_categories())

    content_dir = config.FRONTEND_DIR / "src" / "content"
    public_dir = config.FRONTEND_DIR / "public"
    content_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    recipe_rows = []
    for r in recipes:
        row = r.model_dump(mode="json")
        row["json_ld"] = recipe_json_ld(r, config.SITE_URL)
        recipe_rows.append(row)

    category_rows = []
    for c in categories:
        row = c.model_dump(mode="json")
        row["recipe_slugs"] = [r.slug for r in recipes if in_category(r, c)]
        row["option_slugs"] = [
            r.slug for r in recipes if in_category(r, c, include_options=True) and not in_category(r, c)
        ]
        category_rows.append(row)

    site = json.loads((DATA_DIR / "site.json").read_text(encoding="utf-8"))
    site["site_url"] = config.SITE_URL

    def write_json(name: str, data) -> None:
        (content_dir / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    write_json("recipes.json", recipe_rows)
    write_json("categories.json", category_rows)
    write_json("site.json", site)
    (public_dir / "sitemap.xml").write_text(sitemap_xml(recipes, categories, config.SITE_URL), encoding="utf-8")
    (public_dir / "robots.txt").write_text(robots_txt(config.SITE_URL), encoding="utf-8")

    return f"Exported {len(recipes)} recipes and {len(categories)} categories to {config.FRONTEND_DIR}"


def main() -> None:
    print(run_export())
    print(f"Site URL: {config.SITE_URL}")


if __name__ == "__main__":
    main()
