"""
Recommendation Engine

Implements hybrid recommendation algorithms for event recommendations.
Combines content-based, collaborative, and popularity-based approaches.

@module services/recommendation
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import random

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Hybrid Recommendation Engine for College Events.
    
    Algorithms implemented:
    1. Content-Based Filtering - based on category preferences
    2. Popularity-Based - trending events
    3. Time-Aware - upcoming events preference
    """
    
    def __init__(self):
        """Initialize the recommendation engine."""
        self.category_weights = {}
        self.event_vectors = {}
        self.user_profiles = {}
        self.trending_events = []
        self.last_updated = None
        
        logger.info("Recommendation Engine initialized")
    
    def get_recommendations(
        self,
        user_features: Dict[str, Any],
        exclude_event_ids: List[str],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get personalized event recommendations.
        
        Args:
            user_features: Dictionary containing user preferences and history
            exclude_event_ids: List of event IDs to exclude (already registered)
            limit: Number of recommendations to return
        
        Returns:
            List of recommendation objects with scores and explanations
        """
        recommendations = []
        
        # Algorithm 1: Content-Based (Category Preference) - 50% weight
        content_based = self._content_based_recommendations(
            user_features=user_features,
            exclude_ids=exclude_event_ids,
            limit=limit * 2
        )
        
        # Algorithm 2: Popularity-Based - 30% weight
        popularity_based = self._popularity_recommendations(
            exclude_ids=exclude_event_ids + [r['event_id'] for r in content_based],
            limit=limit
        )
        
        # Algorithm 3: Time-Aware (Upcoming events) - 20% weight
        time_based = self._time_based_recommendations(
            exclude_ids=exclude_event_ids + 
                       [r['event_id'] for r in content_based] +
                       [r['event_id'] for r in popularity_based],
            limit=limit // 2
        )
        
        # Combine and rank recommendations
        all_recommendations = []
        
        # Add content-based with high weight
        for rec in content_based[:limit]:
            rec['score'] = rec.get('score', 0.5) * 0.5  # 50% weight
            rec['algorithm'] = 'content-based'
            all_recommendations.append(rec)
        
        # Add popularity-based
        for rec in popularity_based[:limit // 2]:
            rec['score'] = rec.get('score', 0.5) * 0.3  # 30% weight
            rec['algorithm'] = 'popularity'
            all_recommendations.append(rec)
        
        # Add time-based
        for rec in time_based[:limit // 3]:
            rec['score'] = rec.get('score', 0.5) * 0.2  # 20% weight
            rec['algorithm'] = 'time-aware'
            all_recommendations.append(rec)
        
        # Sort by score and deduplicate
        all_recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        seen_ids = set()
        final_recommendations = []
        
        for rec in all_recommendations:
            if rec['event_id'] not in seen_ids:
                seen_ids.add(rec['event_id'])
                final_recommendations.append(rec)
                
                if len(final_recommendations) >= limit:
                    break
        
        return final_recommendations
    
    def _content_based_recommendations(
        self,
        user_features: Dict[str, Any],
        exclude_ids: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Generate content-based recommendations based on user preferences.
        
        Uses category preferences to score events.
        """
        recommendations = []
        
        preferred_categories = user_features.get('preferred_categories', [])
        engagement_score = user_features.get('engagement_score', 0.5)
        
        # Mock event data - in production, fetch from database
        # This simulates events that would be fetched from the main API
        mock_events = self._get_mock_events()
        
        for event in mock_events:
            if event['id'] in exclude_ids:
                continue
            
            score = 0.0
            reason = ""
            
            # Category match score
            if event['category_id'] in preferred_categories:
                score += 0.7
                reason = "Matches your interests"
            
            # Engagement boost
            score += engagement_score * 0.2
            
            # Popularity boost
            popularity = event.get('popularity_score', 0.5)
            score += popularity * 0.1
            
            if score > 0.3:  # Minimum threshold
                recommendations.append({
                    'event_id': event['id'],
                    'score': min(score, 1.0),
                    'reason': reason or "Recommended for you"
                })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    def _popularity_recommendations(
        self,
        exclude_ids: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Generate popularity-based recommendations.
        
        Based on registration counts and trending scores.
        """
        recommendations = []
        
        mock_events = self._get_mock_events()
        
        for event in mock_events:
            if event['id'] in exclude_ids:
                continue
            
            popularity = event.get('popularity_score', 0.5)
            trending = event.get('trending_score', 0.5)
            
            # Combine popularity and trending
            score = (popularity * 0.6) + (trending * 0.4)
            
            if score > 0.4:  # Minimum threshold for popular events
                recommendations.append({
                    'event_id': event['id'],
                    'score': min(score, 1.0),
                    'reason': "Trending among students"
                })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    def _time_based_recommendations(
        self,
        exclude_ids: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Generate time-based recommendations.
        
        Prioritizes upcoming events that are happening soon.
        """
        recommendations = []
        
        mock_events = self._get_mock_events()
        now = datetime.now()
        
        for event in mock_events:
            if event['id'] in exclude_ids:
                continue
            
            start_date = event.get('start_date')
            if not start_date:
                continue
            
            # Parse date if string
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            
            # Calculate days until event
            days_until = (start_date - now).days
            
            if 0 <= days_until <= 14:  # Within next 2 weeks
                # Higher score for sooner events
                score = 1.0 - (days_until / 14.0)
                
                recommendations.append({
                    'event_id': event['id'],
                    'score': score,
                    'reason': f"Happening in {days_until} days"
                })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    def get_trending_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get currently trending events.
        
        Based on recent registration activity.
        """
        mock_events = self._get_mock_events()
        
        # Sort by trending score
        trending = sorted(
            mock_events,
            key=lambda x: x.get('trending_score', 0),
            reverse=True
        )
        
        return [
            {
                'event_id': e['id'],
                'trending_score': e.get('trending_score', 0),
                'registrations_24h': random.randint(5, 50)  # Simulated
            }
            for e in trending[:limit]
        ]
    
    def retrain(self) -> Dict[str, Any]:
        """
        Retrain the recommendation models.
        
        In production, this would:
        1. Fetch latest user interaction data
        2. Retrain collaborative filtering model
        3. Update category weights
        4. Recalculate event vectors
        """
        logger.info("Retraining recommendation engine...")
        
        # Simulate retraining
        self.last_updated = datetime.now()
        
        return {
            "success": True,
            "message": "Recommendation engine retrained",
            "timestamp": self.last_updated.isoformat()
        }
    
    def _get_mock_events(self) -> List[Dict[str, Any]]:
        """
        Get mock events for demonstration.
        
        In production, these would come from the database via API.
        """
        return [
            {
                'id': 'event-1',
                'title': 'Technical Workshop on AI',
                'category_id': 'cat-tech',
                'popularity_score': 0.85,
                'trending_score': 0.90,
                'start_date': (datetime.now() + timedelta(days=3)).isoformat()
            },
            {
                'id': 'event-2',
                'title': 'Cultural Fest 2024',
                'category_id': 'cat-cultural',
                'popularity_score': 0.95,
                'trending_score': 0.88,
                'start_date': (datetime.now() + timedelta(days=7)).isoformat()
            },
            {
                'id': 'event-3',
                'title': 'Sports Tournament',
                'category_id': 'cat-sports',
                'popularity_score': 0.70,
                'trending_score': 0.65,
                'start_date': (datetime.now() + timedelta(days=5)).isoformat()
            },
            {
                'id': 'event-4',
                'title': 'Research Seminar',
                'category_id': 'cat-academic',
                'popularity_score': 0.60,
                'trending_score': 0.55,
                'start_date': (datetime.now() + timedelta(days=2)).isoformat()
            },
            {
                'id': 'event-5',
                'title': 'Coding Competition',
                'category_id': 'cat-tech',
                'popularity_score': 0.80,
                'trending_score': 0.85,
                'start_date': (datetime.now() + timedelta(days=10)).isoformat()
            },
            {
                'id': 'event-6',
                'title': 'Music Concert',
                'category_id': 'cat-cultural',
                'popularity_score': 0.75,
                'trending_score': 0.70,
                'start_date': (datetime.now() + timedelta(days=14)).isoformat()
            },
            {
                'id': 'event-7',
                'title': 'Career Guidance Session',
                'category_id': 'cat-academic',
                'popularity_score': 0.65,
                'trending_score': 0.60,
                'start_date': (datetime.now() + timedelta(days=4)).isoformat()
            },
            {
                'id': 'event-8',
                'title': 'Hackathon 2024',
                'category_id': 'cat-tech',
                'popularity_score': 0.90,
                'trending_score': 0.95,
                'start_date': (datetime.now() + timedelta(days=21)).isoformat()
            }
        ]