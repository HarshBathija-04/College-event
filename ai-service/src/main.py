"""
AI Microservice for College Event Aggregator

This FastAPI application provides AI-powered features:
- Personalized event recommendations
- Smart search with NLP
- Event category prediction
- Notification priority scoring

@author MCA Final Year Project Team
@version 1.0.0
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Import services
from services.recommendation import RecommendationEngine
from services.search import SearchService
from services.categorization import CategoryPredictor
from services.notification_scorer import NotificationScorer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
recommendation_engine: Optional[RecommendationEngine] = None
search_service: Optional[SearchService] = None
category_predictor: Optional[CategoryPredictor] = None
notification_scorer: Optional[NotificationScorer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - initialize and cleanup services."""
    global recommendation_engine, search_service, category_predictor, notification_scorer
    
    logger.info("Initializing AI services...")
    
    # Initialize services
    recommendation_engine = RecommendationEngine()
    search_service = SearchService()
    category_predictor = CategoryPredictor()
    notification_scorer = NotificationScorer()
    
    logger.info("AI services initialized successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI services...")


# Create FastAPI application
app = FastAPI(
    title="College Event Aggregator - AI Service",
    description="AI-powered features for event recommendations, search, and categorization",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class UserFeatures(BaseModel):
    """User features for recommendation."""
    user_id: str
    preferred_categories: List[str] = Field(default_factory=list)
    engagement_score: float = Field(default=0.0, ge=0.0, le=1.0)
    total_events_attended: int = Field(default=0, ge=0)


class RecommendationRequest(BaseModel):
    """Request model for event recommendations."""
    user_features: UserFeatures
    exclude_event_ids: List[str] = Field(default_factory=list)
    limit: int = Field(default=10, ge=1, le=50)


class RecommendationResponse(BaseModel):
    """Response model for event recommendations."""
    event_id: str
    score: float
    reason: str
    algorithm: str


class SearchRequest(BaseModel):
    """Request model for smart search."""
    query: str = Field(..., min_length=1, max_length=500)
    user_id: Optional[str] = None


class SearchResult(BaseModel):
    """Search result item."""
    event_id: str
    score: float


class SearchResponse(BaseModel):
    """Response model for smart search."""
    results: List[SearchResult]
    processed_query: str
    suggestions: List[str]


class CategoryPredictionRequest(BaseModel):
    """Request model for category prediction."""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)


class CategoryPredictionResponse(BaseModel):
    """Response model for category prediction."""
    predicted_category: str
    confidence: float
    alternative_categories: List[dict]


class NotificationPriorityRequest(BaseModel):
    """Request model for notification priority scoring."""
    user_id: str
    notification_type: str
    title: str
    message: str
    event_id: Optional[str] = None


class NotificationPriorityResponse(BaseModel):
    """Response model for notification priority."""
    priority: str
    score: float
    factors: List[str]


# ============================================
# AUTHENTICATION
# ============================================

async def verify_api_key(x_api_key: str = Header(None)):
    """Verify API key for protected endpoints."""
    expected_key = os.getenv("AI_SERVICE_API_KEY", "")
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }


# ============================================
# RECOMMENDATION ENDPOINTS
# ============================================

@app.post("/recommendations", response_model=List[RecommendationResponse])
async def get_recommendations(
    request: RecommendationRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Get personalized event recommendations for a user.
    
    Uses a hybrid approach combining:
    - Content-based filtering (category preferences)
    - Collaborative filtering (similar users)
    - Popularity-based recommendations
    """
    try:
        if recommendation_engine is None:
            raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
        
        recommendations = recommendation_engine.get_recommendations(
            user_features=request.user_features.dict(),
            exclude_event_ids=request.exclude_event_ids,
            limit=request.limit
        )
        
        logger.info(f"Generated {len(recommendations)} recommendations for user {request.user_features.user_id}")
        
        return recommendations
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@app.get("/recommendations/trending")
async def get_trending_events(limit: int = 10):
    """Get trending events based on recent activity."""
    try:
        if recommendation_engine is None:
            raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
        
        trending = recommendation_engine.get_trending_events(limit=limit)
        return {"trending_events": trending}
    
    except Exception as e:
        logger.error(f"Error getting trending events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================
# SEARCH ENDPOINTS
# ============================================

@app.post("/search", response_model=SearchResponse)
async def smart_search(
    request: SearchRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Smart search with NLP processing.
    
    Features:
    - Query preprocessing and normalization
    - Synonym expansion
    - Intent recognition
    - Personalized ranking (for logged-in users)
    """
    try:
        if search_service is None:
            raise HTTPException(status_code=503, detail="Search service not initialized")
        
        results = search_service.search(
            query=request.query,
            user_id=request.user_id
        )
        
        logger.info(f"Search query '{request.query}' returned {len(results['results'])} results")
        
        return SearchResponse(**results)
    
    except Exception as e:
        logger.error(f"Error in smart search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@app.get("/search/suggestions")
async def get_search_suggestions(query: str, limit: int = 5):
    """Get search suggestions based on partial query."""
    try:
        if search_service is None:
            return {"suggestions": []}
        
        suggestions = search_service.get_suggestions(query=query, limit=limit)
        return {"suggestions": suggestions}
    
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        return {"suggestions": []}


# ============================================
# CATEGORIZATION ENDPOINTS
# ============================================

@app.post("/predict-category", response_model=CategoryPredictionResponse)
async def predict_category(
    request: CategoryPredictionRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Predict event category based on title and description.
    
    Uses a hybrid approach:
    - TF-IDF vectorization
    - Keyword matching
    - Machine learning classifier (when trained)
    """
    try:
        if category_predictor is None:
            raise HTTPException(status_code=503, detail="Category predictor not initialized")
        
        prediction = category_predictor.predict(
            title=request.title,
            description=request.description
        )
        
        logger.info(f"Category predicted for '{request.title[:30]}...': {prediction['predicted_category']}")
        
        return CategoryPredictionResponse(**prediction)
    
    except Exception as e:
        logger.error(f"Error predicting category: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


# ============================================
# NOTIFICATION PRIORITY ENDPOINTS
# ============================================

@app.post("/notification-priority", response_model=NotificationPriorityResponse)
async def score_notification_priority(
    request: NotificationPriorityRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Score notification priority using AI.
    
    Factors considered:
    - Notification type importance
    - User engagement level
    - Event urgency
    - User preferences
    """
    try:
        if notification_scorer is None:
            raise HTTPException(status_code=503, detail="Notification scorer not initialized")
        
        priority = notification_scorer.score_priority(
            user_id=request.user_id,
            notification_type=request.notification_type,
            title=request.title,
            message=request.message,
            event_id=request.event_id
        )
        
        return NotificationPriorityResponse(**priority)
    
    except Exception as e:
        logger.error(f"Error scoring notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


# ============================================
# MODEL MANAGEMENT ENDPOINTS
# ============================================

@app.post("/models/retrain")
async def retrain_models(authenticated: bool = Depends(verify_api_key)):
    """Retrain all ML models with latest data."""
    try:
        results = {}
        
        if recommendation_engine:
            results["recommendation"] = recommendation_engine.retrain()
        
        if category_predictor:
            results["categorization"] = category_predictor.retrain()
        
        logger.info("Model retraining completed")
        
        return {
            "success": True,
            "message": "Models retrained successfully",
            "results": results
        }
    
    except Exception as e:
        logger.error(f"Error retraining models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Retraining error: {str(e)}")


@app.get("/models/status")
async def get_model_status():
    """Get status of all ML models."""
    return {
        "recommendation_engine": recommendation_engine is not None,
        "search_service": search_service is not None,
        "category_predictor": category_predictor is not None,
        "notification_scorer": notification_scorer is not None
    }


# ============================================
# ERROR HANDLERS
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred"
            }
        }
    )


# ============================================
# MAIN ENTRY POINT
# ============================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting AI Service on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )