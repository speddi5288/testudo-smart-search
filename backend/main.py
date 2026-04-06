import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .models import SearchRequest, SearchResponse
from .scraper import load_cache, refresh_cache
from .search import semantic_search

_courses: list[dict] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _courses
    _courses = load_cache()
    if not _courses:
        print("Cache empty — fetching courses from umd.io (first run)...")
        _courses = await refresh_cache()
        print(f"Cached {len(_courses)} courses.")
    else:
        print(f"Loaded {len(_courses)} courses from cache.")
    yield


app = FastAPI(title="Testudo Smart Search", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Chrome extension origin is chrome-extension://...
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "courses_loaded": len(_courses)}


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    if not _courses:
        raise HTTPException(status_code=503, detail="Course catalog not loaded yet.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    results = semantic_search(req.query, _courses)
    return SearchResponse(query=req.query, results=results)


@app.post("/refresh-courses")
async def refresh():
    global _courses
    _courses = await refresh_cache()
    return {"status": "ok", "courses_loaded": len(_courses)}
