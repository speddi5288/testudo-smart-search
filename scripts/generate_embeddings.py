#!/usr/bin/env python3
"""
Generate semantic embeddings for the UMD course catalog.

Prerequisites:
    1. Populate the course cache (run the backend once):
           uv run python main.py          # starts up, fetches catalog, then Ctrl-C

    2. Install embedding dependencies:
           uv sync --group scripts

Usage:
    uv run python scripts/generate_embeddings.py

Output:
    extension/data/courses_embeddings.json  (~20 MB, bundle with the extension)
"""
import base64
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE_PATH = os.path.join(ROOT, "backend", "cache", "courses.json")
OUTPUT_PATH = os.path.join(ROOT, "extension", "data", "courses_embeddings.json")
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def main():
    # ── Verify course cache exists ────────────────────────────────────────────
    if not os.path.exists(CACHE_PATH):
        sys.exit(
            "ERROR: backend/cache/courses.json not found.\n"
            "Start the backend once to populate the cache:\n"
            "  uv run python main.py\n"
            "Wait for 'Cached N courses.' then Ctrl-C, then re-run this script."
        )

    print("Loading courses from cache...")
    with open(CACHE_PATH) as f:
        courses = json.load(f)
    print(f"  {len(courses)} courses loaded.")

    # ── Import heavy dependencies (only needed here, not in the extension) ────
    try:
        import numpy as np
        from sentence_transformers import SentenceTransformer
    except ImportError:
        sys.exit(
            "ERROR: missing dependencies.\n"
            "Run: uv sync --group scripts"
        )

    print(f"Loading model ({MODEL_NAME})...")
    model = SentenceTransformer(MODEL_NAME)

    print("Generating embeddings (takes ~1-3 min on CPU)...")
    texts = [
        f"{c['name']} {(c.get('description') or '').strip()}"
        for c in courses
    ]
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=True,
        batch_size=64,
    )

    # ── Encode as base64 float32 (~16 MB compact vs ~60 MB JSON floats) ───────
    emb_b64 = base64.b64encode(
        embeddings.astype(np.float32).tobytes()
    ).decode("ascii")

    output = {
        "dims": int(embeddings.shape[1]),
        "count": len(courses),
        "courses": [
            {
                "course_id": c["course_id"],
                "name": c["name"],
                "dept_id": c["dept_id"],
                "description": (c.get("description") or "")[:300],
                "gen_ed": c.get("gen_ed") or [],
            }
            for c in courses
        ],
        "embeddings": emb_b64,
    }

    print("Saving...")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f)

    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"\nDone! Saved to extension/data/courses_embeddings.json ({size_mb:.1f} MB)")
    print("\nNext steps:")
    print("  1. Run: uv run python scripts/download_transformers_js.py")
    print("  2. Load extension in Chrome: chrome://extensions > Load unpacked > extension/")


if __name__ == "__main__":
    main()
