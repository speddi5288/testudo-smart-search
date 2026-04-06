import json
import os
import httpx

CACHE_PATH = os.path.join(os.path.dirname(__file__), "cache", "courses.json")
UMD_IO_BASE = "https://api.umd.io/v0/courses"
PAGE_SIZE = 100


async def fetch_all_courses() -> list[dict]:
    """Paginate through umd.io and return all courses."""
    courses = []
    page = 1
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            resp = await client.get(
                UMD_IO_BASE,
                params={"per_page": PAGE_SIZE, "page": page},
            )
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            courses.extend(batch)
            if len(batch) < PAGE_SIZE:
                break
            page += 1
    return courses


def _normalize(raw: dict) -> dict:
    return {
        "course_id": raw.get("course_id", ""),
        "name": raw.get("name", ""),
        "dept_id": raw.get("dept_id", ""),
        "credits": str(raw.get("credits", "")),
        "description": raw.get("description", "") or "",
        "gen_ed": raw.get("gen_ed", []) or [],
    }


async def refresh_cache() -> list[dict]:
    """Fetch fresh data from umd.io and write to cache. Returns normalized list."""
    raw = await fetch_all_courses()
    normalized = [_normalize(c) for c in raw]
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(normalized, f)
    return normalized


def load_cache() -> list[dict]:
    """Load courses from local cache. Returns empty list if cache missing."""
    if not os.path.exists(CACHE_PATH):
        return []
    with open(CACHE_PATH) as f:
        return json.load(f)
