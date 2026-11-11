"""
Category Prediction Service

Predicts event category based on title and description.
Uses weighted keyword matching over the event text.

@module services/categorization
"""

import re
from typing import Any


class CategoryPredictor:
    """
    Event Category Predictor.

    Scores each event type by exact and partial keyword hits, normalized by
    the size of its keyword list, and reports a relative confidence.
    """

    # Category keywords for rule-based classification
    CATEGORY_KEYWORDS = {
        "ACADEMIC": [
            "lecture",
            "seminar",
            "research",
            "study",
            "academic",
            "education",
            "learning",
            "scholar",
            "thesis",
            "paper",
            "publication",
            "symposium",
            "conference",
            "workshop",
            "course",
            "class",
            "tutorial",
        ],
        "CULTURAL": [
            "music",
            "dance",
            "art",
            "cultural",
            "fest",
            "festival",
            "celebration",
            "concert",
            "performance",
            "drama",
            "theatre",
            "exhibition",
            "show",
            "traditional",
            "heritage",
            "food",
            "fashion",
        ],
        "SPORTS": [
            "sports",
            "game",
            "match",
            "tournament",
            "competition",
            "athletics",
            "cricket",
            "football",
            "basketball",
            "volleyball",
            "badminton",
            "running",
            "race",
            "fitness",
            "exercise",
            "championship",
        ],
        "TECHNICAL": [
            "technology",
            "tech",
            "coding",
            "programming",
            "software",
            "hardware",
            "computer",
            "engineering",
            "hackathon",
            "app",
            "web",
            "development",
            "AI",
            "machine learning",
            "data science",
            "robotics",
            "IoT",
            "blockchain",
            "cybersecurity",
            "cloud",
            "database",
        ],
        "WORKSHOP": [
            "workshop",
            "training",
            "hands-on",
            "practical",
            "skill",
            "learning",
            "session",
            "bootcamp",
            "intensive",
            "certification",
            "course",
        ],
        "SEMINAR": [
            "seminar",
            "talk",
            "presentation",
            "discussion",
            "panel",
            "forum",
            "lecture",
            "keynote",
            "address",
            "discourse",
        ],
        "COMPETITION": [
            "competition",
            "contest",
            "challenge",
            "quiz",
            "olympiad",
            "hackathon",
            "battle",
            "showdown",
            "tournament",
            "championship",
            "prize",
        ],
        "SOCIAL": [
            "social",
            "networking",
            "meetup",
            "gathering",
            "party",
            "celebration",
            "get-together",
            "reunion",
            "mixer",
            "connect",
            "community",
        ],
    }

    def predict(self, title: str, description: str) -> dict[str, Any]:
        """Predict the event type from its title and description."""
        return self._rule_based_predict(f"{title} {description}")

    def _rule_based_predict(self, text: str) -> dict[str, Any]:
        """Predict using rule-based keyword matching."""
        # Clean text
        cleaned_text = re.sub(r"[^\w\s]", " ", text.lower())
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
        if top_score == 0:
            return {"predicted_category": "OTHER", "confidence": 0.0, "alternative_categories": []}

        # Calculate confidence (normalize to 0-1)
        # If top score is significantly higher than second, confidence is high
        if len(sorted_scores) > 1 and sorted_scores[1][1] > 0:
            confidence_ratio = top_score / (top_score + sorted_scores[1][1])
        else:
            confidence_ratio = min(top_score * 2, 1.0)

        return {
            "predicted_category": top_category,
            "confidence": round(confidence_ratio, 3),
            "alternative_categories": [
                {"category": cat, "confidence": round(score, 3)} for cat, score in sorted_scores[1:4] if score > 0
            ],
        }
