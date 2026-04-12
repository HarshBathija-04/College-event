"""
Notification Priority Scorer

Scores notification priority using AI-based algorithms.
Considers user engagement, notification type, and event urgency.

@module services/notification_scorer
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class NotificationScorer:
    """
    AI-powered Notification Priority Scorer.
    
    Factors considered:
    - Notification type importance
    - User engagement level
    - Event urgency (if applicable)
    - Time-based factors
    - User preferences
    """
    
    # Base priority scores for notification types
    TYPE_PRIORITY = {
        'EVENT_CANCELLED': 100,
        'EVENT_UPDATE': 80,
        'EVENT_REMINDER': 70,
        'REGISTRATION_CONFIRMATION': 60,
        'EVENT_APPROVAL': 75,
        'EVENT_REJECTION': 75,
        'TRENDING_EVENT': 40,
        'RECOMMENDATION': 30,
        'SYSTEM': 50
    }
    
    # Priority levels
    PRIORITY_LEVELS = {
        'URGENT': (80, 100),
        'HIGH': (60, 79),
        'MEDIUM': (40, 59),
        'LOW': (0, 39)
    }
    
    def __init__(self):
        """Initialize the notification scorer."""
        self.user_engagement_cache = {}
        logger.info("Notification Scorer initialized")
    
    def score_priority(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        event_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate priority score for a notification.
        
        Args:
            user_id: Target user ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            event_id: Optional related event ID
        
        Returns:
            Dictionary with priority level, score, and factors
        """
        factors = []
        score = 0.0
        
        # Factor 1: Base type priority (40% weight)
        base_priority = self.TYPE_PRIORITY.get(notification_type, 50)
        score += base_priority * 0.4
        factors.append(f"Base type priority: {base_priority}")
        
        # Factor 2: User engagement (30% weight)
        engagement_score = self._get_user_engagement(user_id)
        engagement_boost = engagement_score * 30
        score += engagement_boost * 0.3
        factors.append(f"User engagement: {engagement_score:.2f}")
        
        # Factor 3: Content urgency analysis (20% weight)
        urgency_score = self._analyze_urgency(title, message)
        score += urgency_score * 0.2
        factors.append(f"Content urgency: {urgency_score:.1f}")
        
        # Factor 4: Time-based factors (10% weight)
        time_score = self._calculate_time_factor(notification_type, event_id)
        score += time_score * 0.1
        factors.append(f"Time factor: {time_score:.1f}")
        
        # Determine priority level
        priority_level = self._get_priority_level(score)
        
        return {
            'priority': priority_level,
            'score': round(score, 2),
            'factors': factors
        }
    
    def _get_user_engagement(self, user_id: str) -> float:
        """
        Get user engagement score.
        
        In production, fetch from database or cache.
        Returns value between 0 and 1.
        """
        # Check cache first
        if user_id in self.user_engagement_cache:
            return self.user_engagement_cache[user_id]
        
        # Simulate engagement calculation
        # In production, calculate based on:
        # - Event attendance rate
        # - Notification open rate
        # - App usage frequency
        # - Registration patterns
        
        # For demo, return a random but consistent score
        import hashlib
        hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        engagement = (hash_val % 100) / 100.0
        
        # Cache the result
        self.user_engagement_cache[user_id] = engagement
        
        return engagement
    
    def _analyze_urgency(self, title: str, message: str) -> float:
        """
        Analyze content for urgency indicators.
        
        Returns urgency score between 0 and 100.
        """
        urgency_keywords = [
            'urgent', 'immediate', 'asap', 'deadline', 'today', 'tomorrow',
            'last chance', 'final', 'important', 'required', 'mandatory',
            'closing soon', 'limited', 'expiring', 'alert', 'warning'
        ]
        
        combined_text = f"{title} {message}".lower()
        
        urgency_score = 0
        for keyword in urgency_keywords:
            if keyword in combined_text:
                urgency_score += 20
        
        return min(urgency_score, 100)
    
    def _calculate_time_factor(
        self,
        notification_type: str,
        event_id: Optional[str]
    ) -> float:
        """
        Calculate time-based priority factor.
        
        Considers event timing and notification timing.
        """
        score = 50  # Default neutral score
        
        # Boost for event reminders close to event time
        if notification_type == 'EVENT_REMINDER' and event_id:
            # In production, fetch event start time
            # For demo, simulate
            score = 70
        
        # Boost for deadline-related notifications
        if notification_type in ['EVENT_REMINDER', 'REGISTRATION_CONFIRMATION']:
            score += 10
        
        return min(score, 100)
    
    def _get_priority_level(self, score: float) -> str:
        """
        Convert numeric score to priority level.
        """
        for level, (min_score, max_score) in self.PRIORITY_LEVELS.items():
            if min_score <= score <= max_score:
                return level
        
        return 'MEDIUM'
    
    def batch_score(
        self,
        notifications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Score multiple notifications at once.
        
        Useful for batch processing.
        """
        scored_notifications = []
        
        for notification in notifications:
            scored = self.score_priority(
                user_id=notification['user_id'],
                notification_type=notification['type'],
                title=notification['title'],
                message=notification['message'],
                event_id=notification.get('event_id')
            )
            
            scored_notifications.append({
                **notification,
                'priority': scored['priority'],
                'priority_score': scored['score'],
                'priority_factors': scored['factors']
            })
        
        # Sort by priority score (descending)
        scored_notifications.sort(
            key=lambda x: x['priority_score'],
            reverse=True
        )
        
        return scored_notifications
    
    def get_delivery_time(
        self,
        user_id: str,
        priority: str
    ) -> Optional[datetime]:
        """
        Suggest optimal delivery time for notification.
        
        Based on user activity patterns.
        """
        # In production, analyze user's historical activity
        # to determine best delivery time
        
        now = datetime.now()
        
        if priority == 'URGENT':
            # Deliver immediately
            return now
        elif priority == 'HIGH':
            # Deliver within next hour
            return now + timedelta(minutes=15)
        else:
            # Deliver during optimal hours (e.g., 9 AM - 6 PM)
            optimal_hour = 10  # 10 AM
            
            if now.hour < optimal_hour:
                # Schedule for today
                return now.replace(hour=optimal_hour, minute=0)
            else:
                # Schedule for tomorrow
                tomorrow = now + timedelta(days=1)
                return tomorrow.replace(hour=optimal_hour, minute=0)
    
    def clear_cache(self):
        """Clear user engagement cache."""
        self.user_engagement_cache.clear()
        logger.info("Notification scorer cache cleared")