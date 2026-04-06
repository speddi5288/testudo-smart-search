# Testudo Smart Search

A Chrome extension that adds AI-powered semantic course search to [app.testudo.umd.edu](https://app.testudo.umd.edu). Instead of searching by course code, type natural language queries like *"brain science"*, *"intro to machine learning"*, or *"personal finance"* and get back the top 5 matching UMD courses ranked by relevance.

<img width="959" height="383" alt="image" src="https://github.com/user-attachments/assets/e655c41f-20c1-493e-a3af-90905ef17343" />

---

## How It Works

1. The Chrome extension injects a search bar at the top of Testudo
2. You type a natural language query and hit Enter
3. The extension sends your query to a local FastAPI backend
4. The backend uses Claude AI (Haiku model) to rank courses from the full UMD catalog
5. Top 5 results appear with course codes, titles, match scores, and a reason for each match

---

## Project Structure

```
testudo-smart-search/
├── backend/
│   ├── main.py        # FastAPI server (GET /health, POST /search, POST /refresh-courses)
│   ├── scraper.py     # Fetches UMD course catalog from umd.io API and caches it
│   ├── search.py      # Keyword pre-filter + Claude semantic ranking
│   └── models.py      # Pydantic data models
├── extension/
│   ├── manifest.json          # Chrome Extension Manifest V3
│   ├── content/
│   │   ├── content.js         # Injects search UI into Testudo pages
│   │   └── content.css        # UMD-themed styles
│   ├── background/
│   │   └── service_worker.js  # Relays search requests to backend
│   └── icons/
├── main.py            # Uvicorn entry point
└── pyproject.toml     # Python dependencies
```

---

## Setup

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager
- Google Chrome
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/testudo-smart-search.git
cd testudo-smart-search
```

### 2. Install dependencies

```bash
uv sync
```

### 3. Add your API key

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

### 4. Start the backend

```bash
uv run python main.py
```

On first run, the server will automatically fetch and cache all ~4,800 UMD courses from [umd.io](https://umd.io). This takes about 2–3 minutes. Subsequent starts are instant.

### 5. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 6. Use it

Visit [https://app.testudo.umd.edu/soc/](https://app.testudo.umd.edu/soc/) — a red search bar will appear at the top of the page. Type any query and press Enter.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns number of courses loaded |
| `POST` | `/search` | Body: `{"query": "your query"}` — returns top 5 ranked courses |
| `POST` | `/refresh-courses` | Re-fetches the course catalog from umd.io |

---

## Cost

Each search costs approximately **$0.002–0.004** (less than half a cent) using Claude Haiku, the cheapest Claude model. A $5 API credit covers ~1,000–2,500 searches.

---

## Data Source

Course data is sourced from [umd.io](https://umd.io), a free and open UMD API. No authentication required.

---

## Tech Stack

- **Backend**: Python, FastAPI, Anthropic SDK, httpx
- **Extension**: Vanilla JavaScript, Chrome Manifest V3
- **AI**: Claude Haiku (claude-haiku-4-5)
- **Data**: umd.io course API
