"""
Smart Search Service

Implements NLP-based search with query processing,
synonym expansion, and relevance ranking.

@module services/search
"""

import logging
import re
from typing import List, Dict, Any, Optional
from collections import defaultdict

import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.tokenize import word_tokenize

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

logger = logging.getLogger(__name__)


class SearchService:
    """
    Smart Search Service with NLP capabilities.
    
    Features:
    - Query preprocessing and normalization
    - Tokenization and stemming
    - Synonym expansion
    - Intent recognition
    - Relevance scoring
    """
    
    # Event-related synonyms for query expansion
    SYNONYMS = {
        'workshop': ['seminar', 'training', 'session', 'class'],
        'competition': ['contest', 'tournament', 'challenge', 'hackathon'],
        'cultural': ['fest', 'festival', 'celebration', 'event'],
        'sports': ['game', 'match', 'tournament', 'athletics'],
        'technical': ['tech', 'technology', 'engineering', 'coding'],
        'academic': ['education', 'learning', 'study', 'research'],
        'social': ['networking', 'meetup', 'gathering', 'party'],
    }
    
    # Intent keywords
    INTENTS = {
        'find_upcoming': ['upcoming', 'next', 'soon', 'future', 'later'],
        'find_past': ['past', 'previous', 'last', 'completed', 'ended'],
        'find_free': ['free', 'no cost', 'complimentary', 'gratis'],
        'find_popular': ['popular', 'trending', 'hot', 'best', 'top'],
    }
    
    def __init__(self):
        """Initialize the search service."""
        self.stemmer = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))
        
        # Add custom stop words
        self.stop_words.update(['event', 'events', 'college', 'university'])
        
        logger.info("Search Service initialized")
    
    def search(
        self,
        query: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform smart search with NLP processing.
        
        Args:
            query: Raw search query
            user_id: Optional user ID for personalization
        
        Returns:
            Dictionary with search results and metadata
        """
        # Step 1: Preprocess query
        processed_query = self._preprocess_query(query)
        
        # Step 2: Expand query with synonyms
        expanded_terms = self._expand_query(processed_query['tokens'])
        
        # Step 3: Detect intent
        intent = self._detect_intent(query.lower())
        
        # Step 4: Search and rank events
        results = self._search_events(
            query_tokens=expanded_terms,
            intent=intent,
            user_id=user_id
        )
        
        # Step 5: Generate suggestions
        suggestions = self._generate_suggestions(query, results)
        
        return {
            'results': results,
            'processed_query': ' '.join(expanded_terms),
            'suggestions': suggestions
        }
    
    def _preprocess_query(self, query: str) -> Dict[str, Any]:
        """
        Preprocess the search query.
        
        Steps:
        1. Convert to lowercase
        2. Remove special characters
        3. Tokenize
        4. Remove stop words
        5. Stem tokens
        """
        # Convert to lowercase and remove special characters
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', query.lower())
        
        # Tokenize
        tokens = word_tokenize(cleaned)
        
        # Remove stop words and stem
        processed_tokens = []
        for token in tokens:
            if token not in self.stop_words and len(token) > 2:
                stemmed = self.stemmer.stem(token)
                processed_tokens.append(stemmed)
        
        return {
            'original': query,
            'cleaned': cleaned,
            'tokens': processed_tokens
        }
    
    def _expand_query(self, tokens: List[str]) -> List[str]:
        """
        Expand query with synonyms.
        
        Adds related terms to improve recall.
        """
        expanded = set(tokens)
        
        for token in tokens:
            # Check if token matches any synonym group
            for key, synonyms in self.SYNONYMS.items():
                stemmed_key = self.stemmer.stem(key)
                if token == stemmed_key or token in [self.stemmer.stem(s) for s in synonyms]:
                    # Add all synonyms
                    expanded.add(stemmed_key)
                    expanded.update([self.stemmer.stem(s) for s in synonyms])
        
        return list(expanded)
    
    def _detect_intent(self, query: str) -> Optional[str]:
        """
        Detect user intent from query.
        
        Identifies what the user is looking for.
        """
        for intent, keywords in self.INTENTS.items():
            for keyword in keywords:
                if keyword in query:
                    return intent
        
        return None
    
    def _search_events(
        self,
        query_tokens: List[str],
        intent: Optional[str],
        user_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Search and rank events based on query.
        
        In production, this would query the database.
        Here we use mock data for demonstration.
        """
        mock_events = self._get_mock_events()
        results = []
        
        for event in mock_events:
            score = self._calculate_relevance(event, query_tokens, intent)
            
            if score > 0.1:  # Minimum relevance threshold
                results.append({
                    'event_id': event['id'],
                    'score': score
                })
        
        # Sort by relevance score
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results
    
    def _calculate_relevance(
        self,
        event: Dict[str, Any],
        query_tokens: List[str],
        intent: Optional[str]
    ) -> float:
        """
        Calculate relevance score for an event.
        
        Factors:
        - Title match (highest weight)
        - Description match
        - Category match
        - Tag match
        - Intent alignment
        """
        score = 0.0
        
        # Prepare event text
        title_tokens = [self.stemmer.stem(t) for t in word_tokenize(event['title'].lower())]
        desc_tokens = [self.stemmer.stem(t) for t in word_tokenize(event['description'].lower())]
        category_token = self.stemmer.stem(event['category'].lower())
        tag_tokens = [self.stemmer.stem(t.lower()) for t in event.get('tags', [])]
        
        # Title match (weight: 0.4)
        title_matches = sum(1 for t in query_tokens if t in title_tokens)
        score += (title_matches / max(len(query_tokens), 1)) * 0.4
        
        # Description match (weight: 0.3)
        desc_matches = sum(1 for t in query_tokens if t in desc_tokens)
        score += (desc_matches / max(len(query_tokens) * 3, 1)) * 0.3
        
        # Category match (weight: 0.2)
        if category_token in query_tokens:
            score += 0.2
        
        # Tag match (weight: 0.1)
        tag_matches = sum(1 for t in query_tokens if t in tag_tokens)
        score += (tag_matches / max(len(query_tokens), 1)) * 0.1
        
        # Intent boost
        if intent == 'find_upcoming' and event.get('is_upcoming', True):
            score *= 1.2
        elif intent == 'find_popular' and event.get('popularity', 0) > 0.7:
            score *= 1.3
        
        return min(score, 1.0)
    
    def _generate_suggestions(
        self,
        query: str,
        results: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate search suggestions.
        
        Based on query and available results.
        """
        suggestions = []
        
        # Add category-based suggestions
        if 'workshop' not in query.lower():
            suggestions.append(f"{query} workshop")
        if 'competition' not in query.lower():
            suggestions.append(f"{query} competition")
        
        # Add time-based suggestions
        if 'upcoming' not in query.lower():
            suggestions.append(f"upcoming {query}")
        
        return suggestions[:3]
    
    def get_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """
        Get autocomplete suggestions for a partial query.
        """
        if len(query) < 2:
            return []
        
        # Common event-related suggestions
        common_suggestions = [
            'workshop',
            'seminar',
            'competition',
            'cultural fest',
            'sports',
            'technical event',
            'hackathon',
            'career guidance',
            'research seminar'
        ]
        
        # Filter suggestions that start with query
        matching = [s for s in common_suggestions if query.lower() in s.lower()]
        
        return matching[:limit]
    
    def _get_mock_events(self) -> List[Dict[str, Any]]:
        """Get mock events for demonstration."""
        return [
            {
                'id': 'event-1',
                'title': 'Machine Learning Workshop',
                'description': 'Learn the basics of machine learning and AI in this hands-on workshop.',
                'category': 'technical',
                'tags': ['AI', 'ML', 'workshop', 'coding'],
                'is_upcoming': True,
                'popularity': 0.85
            },
            {
                'id': 'event-2',
                'title': 'Annual Cultural Fest',
                'description': 'Join us for a celebration of music, dance, and art.',
                'category': 'cultural',
                'tags': ['music', 'dance', 'art', 'festival'],
                'is_upcoming': True,
                'popularity': 0.95
            },
            {
                'id': 'event-3',
                'title': 'Inter-College Sports Tournament',
                'description': 'Compete in various sports events against other colleges.',
                'category': 'sports',
                'tags': ['sports', 'competition', 'tournament'],
                'is_upcoming': True,
                'popularity': 0.70
            },
            {
                'id': 'event-4',
                'title': 'Research Methodology Seminar',
                'description': 'Learn effective research techniques and methodologies.',
                'category': 'academic',
                'tags': ['research', 'academic', 'seminar'],
                'is_upcoming': True,
                'popularity': 0.60
            },
            {
                'id': 'event-5',
                'title': 'Coding Hackathon 2024',
                'description': '48-hour coding competition with exciting prizes.',
                'category': 'technical',
                'tags': ['coding', 'hackathon', 'competition', 'programming'],
                'is_upcoming': True,
                'popularity': 0.90
            }
        ]