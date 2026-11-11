"""
Quad AI service (FastAPI).

Called only by the backend (shared X-API-Key). Stateless: the backend sends
the events to rank or talk about.

* POST /recommendations     hybrid content / popularity / time ranking
* POST /search              NLP search (stemming, synonyms, TF-IDF, intents)
* POST /predict-category    keyword classifier for the event type
* POST /assistant/chat      Groq LLM campus concierge
* POST /assistant/describe  Groq LLM description writer for organizers
* GET  /health
"""

from __future__ import annotations

import hmac
import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

load_dotenv()

from services import llm  # noqa: E402
from services.categorization import CategoryPredictor  # noqa: E402
from services.recommendation import RecommendationEngine  # noqa: E402
from services.search import SearchService  # noqa: E402

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ai-service")

IS_PROD = os.getenv("ENVIRONMENT", "development") == "production"

app = FastAPI(
    title="Quad AI Service",
    version="2.0.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None,
    openapi_url=None if IS_PROD else "/openapi.json",
)

# Only the backend calls this service server-to-server; browsers are not expected.
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["*"])

recommendation_engine = RecommendationEngine()
search_service = SearchService()
category_predictor = CategoryPredictor()


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("AI_SERVICE_API_KEY", "")
    if not expected:
        if IS_PROD:
            raise HTTPException(status_code=503, detail="Service API key is not configured")
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")


# ---------------- models ----------------


class EventIn(BaseModel):
    id: str = Field(max_length=64)
    title: str = Field(max_length=200)
    description: str = Field(default="", max_length=5000)
    short_description: str | None = Field(default=None, max_length=255)
    type: str = Field(default="OTHER", max_length=20)
    category_id: str | None = Field(default=None, max_length=64)
    category: str = Field(default="", max_length=80)
    tags: list[str] = Field(default_factory=list, max_length=20)
    venue: str = Field(default="", max_length=200)
    is_online: bool = False
    start_date: str
    end_date: str
    registrations: int = Field(default=0, ge=0)
    max_participants: int | None = Field(default=None, ge=1)


class UserFeatures(BaseModel):
    user_id: str = Field(max_length=64)
    preferred_categories: list[str] = Field(default_factory=list, max_length=50)
    engagement_score: float = Field(default=0.0, ge=0.0, le=1.0)
    total_events_attended: int = Field(default=0, ge=0)


class RecommendationRequest(BaseModel):
    user_features: UserFeatures
    events: list[EventIn] = Field(default_factory=list, max_length=300)
    exclude_event_ids: list[str] = Field(default_factory=list, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)


class RecommendationResponse(BaseModel):
    event_id: str
    score: float
    reason: str
    algorithm: str


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    events: list[EventIn] = Field(default_factory=list, max_length=500)


class SearchResult(BaseModel):
    event_id: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    processed_query: str
    suggestions: list[str]


class CategoryPredictionRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)


class CategoryPredictionResponse(BaseModel):
    predicted_category: str
    confidence: float
    alternative_categories: list[dict]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class AssistantUser(BaseModel):
    first_name: str = Field(default="", max_length=60)
    department: str | None = Field(default=None, max_length=100)
    interests: list[str] = Field(default_factory=list, max_length=20)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    events: list[EventIn] = Field(default_factory=list, max_length=60)
    user: AssistantUser | None = None
    now: str = Field(max_length=40)


class ChatResponse(BaseModel):
    reply: str
    event_ids: list[str]


class DescribeRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    type: str = Field(max_length=20)
    notes: str = Field(default="", max_length=2000)
    venue: str = Field(default="", max_length=200)


class DescribeResponse(BaseModel):
    description: str
    short_description: str
    tags: list[str]


# ---------------- routes ----------------


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service", "llm": "configured" if llm.is_configured() else "not_configured"}


@app.post("/recommendations", response_model=list[RecommendationResponse], dependencies=[Depends(verify_api_key)])
def recommendations(req: RecommendationRequest):
    return recommendation_engine.get_recommendations(
        user_features=req.user_features.model_dump(),
        events=[e.model_dump() for e in req.events],
        exclude_event_ids=req.exclude_event_ids,
        limit=req.limit,
    )


@app.post("/search", response_model=SearchResponse, dependencies=[Depends(verify_api_key)])
def search(req: SearchRequest):
    return search_service.search(req.query, [e.model_dump() for e in req.events])


@app.post("/predict-category", response_model=CategoryPredictionResponse, dependencies=[Depends(verify_api_key)])
def predict_category(req: CategoryPredictionRequest):
    return category_predictor.predict(req.title, req.description)


@app.post("/assistant/chat", response_model=ChatResponse, dependencies=[Depends(verify_api_key)])
def assistant_chat(req: ChatRequest):
    return llm.chat(
        message=req.message,
        history=[t.model_dump() for t in req.history],
        events=[e.model_dump() for e in req.events],
        user=req.user.model_dump() if req.user else None,
        now=req.now,
    )


@app.post("/assistant/describe", response_model=DescribeResponse, dependencies=[Depends(verify_api_key)])
def assistant_describe(req: DescribeRequest):
    return llm.describe(req.title, req.type, req.notes, req.venue)


# ---------------- errors ----------------


def _error(status: int, code: str, message: str, details=None) -> JSONResponse:
    body = {"success": False, "error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status, content=body)


@app.exception_handler(llm.LLMError)
async def llm_error_handler(_request: Request, exc: llm.LLMError):
    code = {429: "AI_RATE_LIMITED", 503: "AI_UNAVAILABLE"}.get(exc.status, "AI_ERROR")
    return _error(exc.status, code, exc.message)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
    return _error(exc.status_code, f"HTTP_{exc.status_code}", str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return _error(422, "VALIDATION_ERROR", "Invalid request", details)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return _error(500, "INTERNAL_ERROR", "An internal error occurred")
