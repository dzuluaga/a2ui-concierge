from __future__ import annotations
import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

PROFILES_DIR = Path(os.getenv("PROFILES_DIR", Path.home() / ".lumen_profiles"))


@dataclass
class UserProfile:
    preferences: dict[str, Any] | None = None   # categories, vibe_tags, price_max, notes
    saved_address: str | None = None             # ship-to for autonomous orders
    pre_authorized: bool = False                 # explicit one-time consent
    payment_method: str | None = None            # "card" | "usdc"
    age_token: str | None = None                 # stored VP token from age verification
    loyalty_token: str | None = None             # stored VP token from loyalty (or None)
    loyalty_discount_pct: int = 0                # 0 or 10


def load_profile(session_id: str) -> UserProfile:
    path = PROFILES_DIR / f"{session_id}.json"
    if not path.exists():
        return UserProfile()
    try:
        data = json.loads(path.read_text())
        return UserProfile(
            preferences=data.get("preferences"),
            saved_address=data.get("saved_address"),
            pre_authorized=data.get("pre_authorized", False),
            payment_method=data.get("payment_method"),
            age_token=data.get("age_token"),
            loyalty_token=data.get("loyalty_token"),
            loyalty_discount_pct=data.get("loyalty_discount_pct", 0),
        )
    except Exception:
        return UserProfile()


def save_profile(session_id: str, profile: UserProfile) -> None:
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    path = PROFILES_DIR / f"{session_id}.json"
    path.write_text(json.dumps(asdict(profile), indent=2))
