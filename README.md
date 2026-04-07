# Testudo Smart Search

A Chrome extension that adds semantic course search to [app.testudo.umd.edu](https://app.testudo.umd.edu). Instead of searching by course code, type natural language queries like *"brain science"*, *"intro to machine learning"*, or *"pickleball"* and get back the top matching UMD courses ranked by relevance.

<img width="959" height="383" alt="image" src="https://github.com/user-attachments/assets/e655c41f-20c1-493e-a3af-90905ef17343" />

All search runs **entirely in your browser** — no backend, no API keys, no ongoing costs.

---

## How It Works

1. The extension injects a search bar at the top of Testudo
2. You type a natural language query and press Enter
3. A local ML model (running via WebAssembly in the browser) compares your query against pre-computed embeddings for every UMD course
4. Top results appear with course codes, titles, match scores, and descriptions — click any result to jump straight to that course on Testudo

The model downloads from HuggingFace on first use (~23 MB) and is cached in your browser permanently after that.

---

## Project Structure

```
testudo-smart-search/
├── backend/                        # One-time data fetching (not needed after setup)
│   ├── main.py                     # FastAPI server to populate the course cache
│   ├── scraper.py                  # Paginates umd.io API -> backend/cache/courses.json
│   ├── search.py                   # Pydantic models and search utilities
│   └── models.py                   # Pydantic models
├── extension/                      # The Chrome extension
│   ├── manifest.json               # Manifest V3
│   ├── content/
│   │   ├── content.js              # Injects search UI into Testudo
│   │   └── content.css             # UMD-themed styles
│   ├── background/
│   │   └── service_worker.js       # Creates offscreen document, relays messages
│   ├── offscreen/
│   │   ├── offscreen.html          # Hidden page that hosts the ML runtime
│   │   └── offscreen.js            # Loads Transformers.js, runs cosine similarity search
│   ├── data/                       # courses_embeddings.json goes here (generated, not committed)
│   └── lib/                        # transformers.min.js goes here (downloaded, not committed)
├── scripts/
│   ├── generate_embeddings.py      # Encodes all courses -> extension/data/courses_embeddings.json
│   └── download_transformers_js.py # Downloads Transformers.js -> extension/lib/
├── main.py                         # Uvicorn entry point (setup only)
└── pyproject.toml                  # Python dependencies
```

---

## Developer Setup

These steps are only needed once to generate the data files bundled with the extension.

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv)
- Google Chrome

### 1. Clone the repo

```bash
git clone https://github.com/your-username/testudo-smart-search.git
cd testudo-smart-search
```

### 2. Install dependencies

```bash
uv sync
```

### 3. Fetch the UMD course catalog

Start the backend once to populate the local course cache (~4,800 courses from [umd.io](https://umd.io)):

```bash
uv run python main.py
# Wait for "Application startup complete", then Ctrl-C
```

### 4. Generate course embeddings

```bash
uv sync --group scripts
uv run python scripts/generate_embeddings.py
```

Encodes every course description into a semantic vector and saves to `extension/data/courses_embeddings.json` (~11 MB). Takes 1-3 minutes on CPU.

### 5. Download Transformers.js

```bash
uv run python scripts/download_transformers_js.py
```

Downloads the Transformers.js library (~876 KB) into `extension/lib/`.

### 6. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 7. Use it

Visit [https://app.testudo.umd.edu/soc/](https://app.testudo.umd.edu/soc/). A red search bar will appear at the top. Type any query and press Enter.

> **First search:** The ML model (~23 MB) downloads from HuggingFace and caches in your browser. This takes 15-30 seconds. Every search after that is instant.

---

## What Is and Is Not Committed

| File | Committed? | How to recreate |
|---|---|---|
| `backend/cache/courses.json` | No | `uv run python main.py` |
| `extension/data/courses_embeddings.json` | No | `uv run python scripts/generate_embeddings.py` |
| `extension/lib/transformers.min.js` | No | `uv run python scripts/download_transformers_js.py` |
| `.env` | No | Not needed (no API keys required) |

---

## Data Source

Course data comes from [umd.io](https://umd.io), a free and open UMD API. No authentication required.

---

## Tech Stack

- **ML inference**: [Transformers.js](https://github.com/xenova/transformers.js) + `all-MiniLM-L6-v2` (WebAssembly, runs in-browser)
- **Embeddings**: [sentence-transformers](https://www.sbert.net/) (Python, one-time offline generation)
- **Extension**: Vanilla JavaScript, Chrome Manifest V3
- **Data**: umd.io course API, FastAPI (setup only)
