from pydantic import BaseModel
from typing import Optional


class Course(BaseModel):
    course_id: str
    name: str
    dept_id: str
    credits: str
    description: str
    gen_ed: list[str] = []


class SearchRequest(BaseModel):
    query: str
    term: Optional[str] = None


class SearchResult(BaseModel):
    course_id: str
    dept_id: str
    title: str
    match_score: int  # 0-100
    reason: str


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
