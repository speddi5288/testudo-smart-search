import json
import os
import anthropic
from .models import SearchResult

CLIENT = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5-20251001"
MAX_CANDIDATES = 100
DESC_TRUNCATE = 75


def _truncate(courses: list[dict]) -> list[dict]:
    """Slim down course objects to reduce token usage."""
    return [
        {
            "course_id": c["course_id"],
            "name": c["name"],
            "dept_id": c["dept_id"],
            "description": c["description"][:DESC_TRUNCATE],
        }
        for c in courses
    ]


def _prefilter(query: str, courses: list[dict]) -> list[dict]:
    """Keyword pre-scan: keep courses that share any word with the query."""
    words = {w.lower() for w in query.split() if len(w) > 2}
    if not words:
        return courses[:MAX_CANDIDATES]

    scored = []
    for c in courses:
        haystack = (c["course_id"] + " " + c["name"] + " " + c["description"]).lower()
        hits = sum(1 for w in words if w in haystack)
        scored.append((hits, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    # take top MAX_CANDIDATES (any with ≥1 hit first, then fill with rest)
    top = [c for hits, c in scored if hits > 0][:MAX_CANDIDATES]
    if len(top) < 20:
        # not enough keyword hits — broaden to avoid empty results
        top = [c for _, c in scored][:MAX_CANDIDATES]
    return top


SYSTEM_PROMPT = """\
You are a UMD course advisor. Given a student's natural language query, \
return the top 5 most relevant courses from the provided catalog as JSON.

Respond ONLY with a JSON array (no markdown, no explanation) of exactly this shape:
[
  {
    "course_id": "CMSC131",
    "dept_id": "CMSC",
    "title": "Object-Oriented Programming I",
    "match_score": 92,
    "reason": "One sentence explaining why this matches the query."
  }
]
Sorted by match_score descending (0 = no match, 100 = perfect match).\
"""


def semantic_search(query: str, courses: list[dict]) -> list[SearchResult]:
    candidates = _prefilter(query, courses)
    slim = _truncate(candidates)

    user_message = (
        f'Query: "{query}"\n\n'
        f"Courses:\n{json.dumps(slim, separators=(',', ':'))}"
    )

    message = CLIENT.messages.create(
        model=MODEL,
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = message.content[0].text.strip()
    # strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    data = json.loads(raw)
    return [SearchResult(**item) for item in data]
