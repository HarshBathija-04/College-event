"""
Category Prediction Service

Predicts event category based on title and description.
Uses TF-IDF and keyword matching for classification.

@module services/categorization
"""

import logging
from typing import Dict, Any, List
from collections import Counter
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import os

logger = logging.getLogger(__name__)


class CategoryPredictor:
    """
    Event Category Predictor.
    
    Uses a hybrid approach:
    1. Keyword-based classification
    2. TF-IDF vectorization with ML classifier (when trained)
    3. Rule-based fallback
    """
    
    # Category keywords for rule-based classification
    CATEGORY_KEYWORDS = {
        'ACADEMIC': [
            'lecture', 'seminar', 'research', 'study', 'academic', 'education',
            'learning', 'scholar', 'thesis', 'paper', 'publication', 'symposium',
            'conference', 'workshop', 'course', 'class', 'tutorial'
        ],
        'CULTURAL': [
            'music', 'dance', 'art', 'cultural', 'fest', 'festival', 'celebration',
            'concert', 'performance', 'drama', 'theatre', 'exhibition', 'show',
            'traditional', 'heritage', 'food', 'fashion'
        ],
        'SPORTS': [
            'sports', 'game', 'match', 'tournament', 'competition', 'athletics',
            'cricket', 'football', 'basketball', 'volleyball', 'badminton',
            'running', 'race', 'fitness', 'exercise', 'championship'
        ],
        'TECHNICAL': [
            'technology', 'tech', 'coding', 'programming', 'software', 'hardware',
            'computer', 'engineering', 'hackathon', 'app', 'web', 'development',
            'AI', 'machine learning', 'data science', 'robotics', 'IoT',
            'blockchain', 'cybersecurity', 'cloud', 'database'
        ],
        'WORKSHOP': [
            'workshop', 'training', 'hands-on', 'practical', 'skill', 'learning',
            'session', 'bootcamp', 'intensive', 'certification', 'course'
        ],
        'SEMINAR': [
            'seminar', 'talk', 'presentation', 'discussion', 'panel', 'forum',
            'lecture', 'keynote', 'address', 'discourse'
        ],
        'COMPETITION': [
            'competition', 'contest', 'challenge', 'quiz', 'olympiad', 'hackathon',
            'battle', 'showdown', 'tournament', 'championship', 'prize'
        ],
        'SOCIAL': [
            'social', 'networking', 'meetup', 'gathering', 'party', 'celebration',
            'get-together', 'reunion', 'mixer', 'connect', 'community'
        ]
    }
    
    def __init__(self):
        """Initialize the category predictor."""
        self.vectorizer = None
        self.classifier = None
        self.model_loaded = False
        
        # Try to load pre-trained model
        self._load_model()
        
        logger.info("Category Predictor initialized")
    
    def _load_model(self):
        """Load pre-trained model if available."""
        model_path = os.path.join('models', 'category_classifier.pkl')
        vectorizer_path = os.path.join('models', 'category_vectorizer.pkl')
        
        try:
            if os.path.exists(model_path) and os.path.exists(vectorizer_path):
                self.classifier = joblib.load(model_path)
                self.vectorizer = joblib.load(vectorizer_path)
                self.model_loaded = True
                logger.info("Pre-trained model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load pre-trained model: {e}")
    
    def predict(self, title: str, description: str) -> Dict[str, Any]:
        """
        Predict event category.
        
        Args:
            title: Event title
            description: Event description
        
        Returns:
            Dictionary with predicted category and confidence scores
        """
        # Combine title and description
        text = f"{title} {description}".lower()
        
        # Try ML prediction if model is loaded
        if self.model_loaded and self.vectorizer and self.classifier:
            try:
                return self._ml_predict(text)
            except Exception as e:
                logger.warning(f"ML prediction failed, falling back to rule-based: {e}")
        
        # Fall back to rule-based prediction
        return self._rule_based_predict(text)
    
    def _ml_predict(self, text: str) -> Dict[str, Any]:
        """Predict using ML model."""
        # Vectorize text
        X = self.vectorizer.transform([text])
        
        # Get prediction and probabilities
        prediction = self.classifier.predict(X)[0]
        probabilities = self.classifier.predict_proba(X)[0]
        
        # Get top categories
        category_names = self.classifier.classes_
        category_probs = list(zip(category_names, probabilities))
        category_probs.sort(key=lambda x: x[1], reverse=True)
        
        return {
            'predicted_category': prediction,
            'confidence': round(category_probs[0][1], 3),
            'alternative_categories': [
                {'category': cat, 'confidence': round(prob, 3)}
                for cat, prob in category_probs[1:4]
            ]
        }
    
    def _rule_based_predict(self, text: str) -> Dict[str, Any]:
        """Predict using rule-based keyword matching."""
        # Clean text
        cleaned_text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = set(cleaned_text.split())
        
        # Calculate scores for each category
        scores = {}
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                keyword_lower = keyword.lower()
                # Check for exact word match
                if keyword_lower in words:
                    score += 1
                # Check for partial match
                elif any(keyword_lower in word for word in words):
                    score += 0.5
            
            # Normalize by number of keywords
            scores[category] = score / len(keywords)
        
        # Sort by score
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        # Get top category
        top_category = sorted_scores[0][0]
        top_score = sorted_scores[0][1]
        
        # Calculate confidence (normalize to 0-1)
        # If top score is significantly higher than second, confidence is high
        if len(sorted_scores) > 1 and sorted_scores[1][1] > 0:
            confidence_ratio = top_score / (top_score + sorted_scores[1][1])
        else:
            confidence_ratio = min(top_score * 2, 1.0)
        
        return {
            'predicted_category': top_category,
            'confidence': round(confidence_ratio, 3),
            'alternative_categories': [
                {'category': cat, 'confidence': round(score, 3)}
                for cat, score in sorted_scores[1:4] if score > 0
            ]
        }
    
    def retrain(self) -> Dict[str, Any]:
        """
        Retrain the category prediction model.
        
        In production, this would:
        1. Fetch labeled event data from database
        2. Train TF-IDF vectorizer
        3. Train classifier (Naive Bayes or SVM)
        4. Save model to disk
        """
        logger.info("Retraining category predictor...")
        
        # Simulate training
        # In production, fetch actual data and train
        
        self.model_loaded = False
        
        return {
            "success": True,
            "message": "Category predictor retrained (simulated)",
            "model_loaded": self.model_loaded
        }
    
    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extract keywords from text using TF-IDF.
        
        Useful for auto-generating event tags.
        """
        if not self.vectorizer:
            # Create a temporary vectorizer
            vectorizer = TfidfVectorizer(
                max_features=100,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            # Fit on single document (for keyword extraction)
            try:
                X = vectorizer.fit_transform([text])
                feature_names = vectorizer.get_feature_names_out()
                scores = X.toarray()[0]
                
                # Get top keywords
                keyword_scores = list(zip(feature_names, scores))
                keyword_scores.sort(key=lambda x: x[1], reverse=True)
                
                return [kw for kw, _ in keyword_scores[:top_n]]
            except Exception as e:
                logger.error(f"Keyword extraction failed: {e}")
                return []
        
        return []