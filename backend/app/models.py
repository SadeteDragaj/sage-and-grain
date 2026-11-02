"""Content models.

The diet-tag rules from the design brief are enforced here, so a recipe with a
wrong label fails to load (and fails the tests) instead of reaching the site:

* A diet tag is only allowed when every ingredient supports it.
* Oats count as gluten-free only when they are "certified gluten-free oats".
* A recipe that needs a swap to be gluten-free gets a "GF option"
  (``diet_options``), never the full Gluten-Free tag.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

from .richtext import clean_article, placeholders

Diet = Literal["gluten-free", "vegan", "vegetarian", "dairy-free", "high-protein"]
Meal = Literal["breakfast", "lunch", "dinner", "snack", "dessert"]
Difficulty = Literal["easy", "medium", "advanced"]
# What an ingredient contains that rules out a diet tag.
Flag = Literal["gluten", "meat", "fish", "dairy", "egg", "honey"]

DIET_LABELS: dict[str, str] = {
    "gluten-free": "Gluten-Free",
    "vegan": "Vegan",
    "vegetarian": "Vegetarian",
    "dairy-free": "Dairy-Free",
    "high-protein": "High-Protein",
}
MEAL_LABELS: dict[str, str] = {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "snack": "Snack",
    "dessert": "Dessert",
}

# Ingredients carrying any of these flags rule the diet out.
DIET_BLOCKERS: dict[str, set[str]] = {
    "gluten-free": {"gluten"},
    "vegan": {"meat", "fish", "dairy", "egg", "honey"},
    "vegetarian": {"meat", "fish"},
    "dairy-free": {"dairy"},
}


def check_slug(slug: str) -> str:
    """A recipe's address, /recipes/<slug>."""
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError("use lowercase letters, numbers and single hyphens, e.g. vegan-chickpea-curry")
    return slug


class Ingredient(BaseModel):
    qty: float | None = None
    unit: str = ""
    item: str = Field(min_length=1)
    note: str = ""
    contains: list[Flag] = Field(default_factory=list)
    # How to make this ingredient gluten-free, e.g. "Use certified gluten-free oats."
    gf_swap: str | None = None


class Step(BaseModel):
    text: str = Field(min_length=1)
    timer_seconds: int | None = None
    # Shown in cooking mode: the ingredients this step needs (indexes into
    # Recipe.ingredients, so quantities scale), a short tip, and what to check
    # when the timer finishes.
    uses: list[int] = Field(default_factory=list)
    tip: str | None = None
    timer_done: str | None = None


class Note(BaseModel):
    title: str
    text: str


class FAQItem(BaseModel):
    question: str
    answer: str


class Storage(BaseModel):
    fridge: str | None = None
    freezer: str | None = None
    reheat: str | None = None
    # One line for the end of cooking mode, e.g. "Leftovers keep for 4 days in the fridge."
    summary: str | None = None


class Image(BaseModel):
    alt: str
    # Path under /images. Supply 16:9, 4:3 and 1:1 crops with the same stem.
    src: str | None = None


class Recipe(BaseModel):
    slug: str
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    intro: str = Field(min_length=1)
    image: Image
    meal: Meal
    diets: list[Diet]
    diet_options: list[Diet] = Field(default_factory=list)
    collections: list[str] = Field(default_factory=list)
    cuisine: str
    difficulty: Difficulty
    prep_minutes: int
    cook_minutes: int
    extra_time: str | None = None  # e.g. "overnight" — not counted in total_minutes
    servings: int = Field(ge=1)
    yield_label: str = "servings"
    ingredients: list[Ingredient] = Field(min_length=1)
    steps: list[Step] = Field(min_length=1)

    # The article above the recipe card, written in the admin's editor. Cleaned on
    # every load (app/richtext.py), so it is safe to render as HTML.
    article_html: str | None = None
    storage: Storage | None = None
    faq: list[FAQItem] = Field(default_factory=list)

    author: str = "[Author name]"
    date_published: date
    date_modified: date
    popularity: int = 100  # lower = more popular this week

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, slug: str) -> str:
        return check_slug(slug)

    @field_validator("article_html")
    @classmethod
    def safe_article(cls, article: str | None) -> str | None:
        return clean_article(article)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_minutes(self) -> int:
        return self.prep_minutes + self.cook_minutes

    @model_validator(mode="after")
    def check_article(self) -> "Recipe":
        left = placeholders(self.article_html)
        if left:
            raise ValueError(f"replace the example text in the article: {', '.join(left[:3])}")
        return self

    @model_validator(mode="after")
    def check_diet_tags(self) -> "Recipe":
        for diet in self.diets:
            blocked = DIET_BLOCKERS.get(diet, set())
            offending = [i.item for i in self.ingredients if blocked & set(i.contains)]
            if offending:
                raise ValueError(
                    f"{self.slug}: tagged {diet} but these ingredients rule it out: {offending}"
                )

        for diet in self.diet_options:
            if diet in self.diets:
                raise ValueError(f"{self.slug}: {diet} is both a full tag and an option")
            if diet != "gluten-free":
                raise ValueError(f"{self.slug}: only 'GF option' is supported as a diet option")
            gluten_items = [i for i in self.ingredients if "gluten" in i.contains]
            if not gluten_items:
                raise ValueError(
                    f"{self.slug}: nothing needs swapping, so tag it Gluten-Free instead of GF option"
                )
            missing = [i.item for i in gluten_items if not i.gf_swap]
            if missing:
                raise ValueError(f"{self.slug}: GF option needs a gf_swap on: {missing}")

        for n, step in enumerate(self.steps, start=1):
            bad = [i for i in step.uses if not 0 <= i < len(self.ingredients)]
            if bad:
                raise ValueError(f"{self.slug}: step {n} uses ingredients that don't exist: {bad}")
            if step.timer_done and not step.timer_seconds:
                raise ValueError(f"{self.slug}: step {n} has timer_done but no timer")

        for ing in self.ingredients:
            name = ing.item.lower()
            if "oat" in name and "gluten" not in ing.contains and "certified gluten-free" not in name:
                raise ValueError(
                    f"{self.slug}: '{ing.item}' — oats are only gluten-free when certified; "
                    "say 'certified gluten-free oats' or flag them as containing gluten"
                )
        return self


class CategoryCollection(BaseModel):
    label: str
    query: str  # query string for /recipes, e.g. "diet=vegan&meal=breakfast"


class Category(BaseModel):
    slug: str
    name: str
    h1: str
    meta_description: str
    intro: str
    # How recipes are matched: a diet tag, a meal (one or more) or an editorial collection.
    match_diet: Diet | None = None
    match_meals: list[Meal] = Field(default_factory=list)
    match_collection: str | None = None
    collections: list[CategoryCollection] = Field(default_factory=list)
    guide_title: str
    guide: list[Note]
    faq: list[FAQItem]
    related: list[str] = Field(default_factory=list)
    tone: str = "green"

    @model_validator(mode="after")
    def check_match(self) -> "Category":
        if not (self.match_diet or self.match_meals or self.match_collection):
            raise ValueError(f"category {self.slug} matches nothing")
        return self
