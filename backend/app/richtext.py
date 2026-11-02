"""Cleaning and helpers for the article HTML written in the admin's editor.

The article is rendered as raw HTML on the site, so everything is cleaned here,
on every load and save: only the tags the editor can make survive, images must
come from /images/ (uploaded through the admin), and links can only be web,
mail or site-relative links.
"""

from __future__ import annotations

import html
import re

import nh3

TAGS = {"h2", "h3", "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "img"}
ATTRIBUTES = {"a": {"href", "title"}, "img": {"src", "alt", "width", "height"}}
URL_SCHEMES = {"http", "https", "mailto"}


def _filter(tag: str, attr: str, value: str) -> str | None:
    if tag == "img" and attr == "src" and not value.startswith("/images/"):
        return None
    if tag == "img" and attr in ("width", "height") and not value.isdigit():
        return None
    return value


def clean_article(raw: str | None) -> str | None:
    """Safe HTML, or None when the article is empty."""
    if not raw:
        return None
    text = raw.replace("&nbsp;", " ").replace(" ", " ")
    text = re.sub(r"<h1(\s[^>]*)?>", "<h2>", text).replace("</h1>", "</h2>")  # the page already has the H1
    text = re.sub(r"<h[456](\s[^>]*)?>", "<h3>", text)
    text = re.sub(r"</h[456]>", "</h3>", text)
    out = nh3.clean(
        text,
        tags=TAGS,
        attributes=ATTRIBUTES,
        attribute_filter=_filter,
        url_schemes=URL_SCHEMES,
        link_rel=None,
        set_tag_attribute_values={"img": {"loading": "lazy", "decoding": "async"}},
    )
    out = re.sub(r"<img(?![^>]*\ssrc=)[^>]*>", "", out)  # images whose source was rejected
    out = re.sub(r"<(p|h2|h3|li)>(\s|<br>)*</\1>", "", out)  # empty blocks the editor leaves behind
    out = re.sub(r"<(ul|ol)>\s*</\1>", "", out).strip()
    return out or None


def placeholders(article: str | None) -> list[str]:
    """[Bracketed] example text from the article template that hasn't been replaced."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", article or ""))
    return re.findall(r"\[[^\]]{3,}\]", text)


def word_count(article: str | None) -> int:
    if not article:
        return 0
    return len(html.unescape(re.sub(r"<[^>]+>", " ", article)).split())


def image_count(article: str | None) -> int:
    return len(re.findall(r"<img\s", article or ""))
