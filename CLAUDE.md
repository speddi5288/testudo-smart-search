# Testudo Smart Search — CLAUDE.md

## What This Is

A Chrome extension that injects a semantic search bar into `app.testudo.umd.edu`. Students type natural language queries (e.g., "brain science", "pickleball") and get back UMD courses ranked by relevance, powered by Claude (Anthropic API).

## Architecture

```
testudo-smart-search/
├── backend/
│   ├── main.py         # FastAPI app — 3 endpoints: GET /health, POST /search, POST /refresh-courses
│   ├── scraper.py      # Paginates umd.io API, caches full course catalog to backend/cache/courses.json
│   ├── search.py       # Keyword pre-filter → Claude (claude-haiku-4-5) → ranked JSON results
│   ├── models.py       # Pydantic: Course, SearchRequest, SearchResult, SearchResponse
│   └── cache/          # courses.json written here on first run (gitignored)
├── extension/
│   ├── manifest.json           # MV3, runs on *://app.testudo.umd.edu/*, localhost:8000 host permission
│   ├── content/
│   │   ├── content.js          # Injects #tss-root UI, sends SEARCH messages to service worker
│   │   └── content.css         # UMD red (#e21833) theme, card-style results dropdown
│   ├── background/
│   │   └── service_worker.js   # Relays SEARCH messages → POST http://localhost:8000/search
│   └── icons/                  # icon16/48/128.png
├── main.py             # Entry point: uvicorn backend.main:app
├── pyproject.toml      # Dependencies: fastapi, uvicorn, anthropic, httpx, python-dotenv, requests
└── .env                # ANTHROPIC_API_KEY (gitignored)
```

## Search Flow

1. User visits `app.testudo.umd.edu` → `content.js` injects search bar at top of page
2. User types query → `content.js` sends `{ type: "SEARCH", query }` to service worker
3. Service worker POSTs to `http://localhost:8000/search`
4. Backend loads courses from cache → keyword pre-filters to ≤500 candidates → sends to Claude
5. Claude returns top 10 matches as JSON: `course_id`, `dept_id`, `title`, `match_score` (0–100), `reason`
6. Results rendered as cards with color-coded score badges (green/amber/red)

## Running Locally

```bash
# Install deps
uv sync

# Start backend (auto-fetches course catalog on first run)
uv run python main.py
# or: uv run uvicorn backend.main:app --reload

# Load extension in Chrome
# chrome://extensions → Developer mode → Load unpacked → select extension/
```

## Key Implementation Details

- **Data source:** `https://api.umd.io/v0/courses` — free, no auth, paginated at 100/page
- **Cache:** `backend/cache/courses.json` — populated on startup if missing, refreshable via `POST /refresh-courses`
- **AI model:** `claude-haiku-4-5-20251001` — fast and cheap for ranking
- **Pre-filter:** Keyword overlap scan reduces candidate list before sending to Claude (token efficiency)
- **Description truncation:** 200 chars per course before sending to Claude
- **CORS:** Wildcard allowed (Chrome extension origin is `chrome-extension://...`)

## Status

All core features are implemented and ready to test. No commits yet.
