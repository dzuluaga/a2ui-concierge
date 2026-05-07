from __future__ import annotations
import copy
import json
from functools import lru_cache
from importlib import resources
from typing import Any


@lru_cache(maxsize=1)
def load_catalog() -> list[dict[str, Any]]:
    with resources.files("concierge").joinpath("catalog.json").open() as f:
        return json.load(f)


def search(
    *,
    category: str | None = None,
    price_max: float | None = None,
    vibe_tags: list[str] | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    items = load_catalog()
    if category:
        items = [p for p in items if p["category"] == category]
    if price_max is not None:
        items = [p for p in items if p["price"] <= price_max]
    if vibe_tags:
        wanted = set(vibe_tags)
        items = [p for p in items if wanted.intersection(p["vibe_tags"])]
    return copy.deepcopy(items[:limit])


def get(product_id: str) -> dict[str, Any]:
    for p in load_catalog():
        if p["id"] == product_id:
            return copy.deepcopy(p)
    raise KeyError(product_id)
