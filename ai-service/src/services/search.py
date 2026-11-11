"""
Smart search.

Pipeline: normalize -> tokenize -> drop stop words -> Porter-stem -> expand
synonyms -> TF-IDF cosine similarity against the candidate events, with a
title boost and intent detection ("upcoming", "popular", "online", "free").
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SYNONYMS = {
    "workshop": ["seminar", "training", "session", "class", "bootcamp"],
    "competition": ["contest", "tournament", "challenge", "hackathon"],
    "cultural": ["fest", "festival", "celebration", "music", "dance"],
    "sports": ["game", "match", "tournament", "athletics"],
    "technical": ["tech", "technology", "engineering", "coding", "programming"],
    "academic": ["education", "learning", "lecture", "research"],
    "social": ["networking", "meetup", "gathering", "alumni", "careers"],
    "ai": ["ml", "machine", "learning", "data"],
}

INTENTS = {
    "find_upcoming": ["upcoming", "next", "soon", "this week", "tomorrow", "today"],
    "find_popular": ["popular", "trending", "hot", "best", "top"],
    "find_online": ["online", "virtual", "remote"],
}

STOP_WORDS = set(ENGLISH_STOP_WORDS) | {"event", "events", "college", "campus", "university", "find", "show", "want"}
_stemmer = PorterStemmer()
_STEMMED_SYNONYMS = {_stemmer.stem(k): {_stemmer.stem(s) for s in [k, *v]} for k, v in SYNONYMS.items()}


def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [_stemmer.stem(w) for w in words if w not in STOP_WORDS and len(w) > 1]


def expand(tokens: list[str]) -> list[str]:
    expanded = list(dict.fromkeys(tokens))
    for token in tokens:
        for group in _STEMMED_SYNONYMS.values():
            if token in group:
                expanded.extend(t for t in group if t not in expanded)
    return expanded


def detect_intent(query: str) -> str | None:
    q = query.lower()
    for intent, keywords in INTENTS.items():
        if any(k in q for k in keywords):
            return intent
    return None


def _event_text(e: dict[str, Any]) -> str:
    # Title repeated to weight it above the description.
    parts = [e.get("title", "")] * 3 + [
        e.get("short_description") or "",
        e.get("description", ""),
        e.get("category", ""),
        e.get("type", ""),
        " ".join(e.get("tags") or []),
        e.get("venue", ""),
    ]
    return " ".join(tokenize(" ".join(parts)))


class SearchService:
    def search(self, query: str, events: list[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
        now = now or datetime.now(UTC)
        tokens = expand(tokenize(query))
        intent = detect_intent(query)
        if not events or not tokens:
            return {"results": [], "processed_query": " ".join(tokens), "suggestions": self._suggestions(query)}

        docs = [_event_text(e) for e in events]
        vectorizer = TfidfVectorizer(token_pattern=r"\S+", sublinear_tf=True)
        matrix = vectorizer.fit_transform(docs)
        query_vec = vectorizer.transform([" ".join(tokens)])
        similarity = cosine_similarity(query_vec, matrix)[0]

        max_regs = max((e.get("registrations") or 0) for e in events) or 1
        results = []
        for event, score in zip(events, similarity, strict=False):
            if score <= 0.02:
                continue
            if intent == "find_upcoming":
                days = (datetime.fromisoformat(event["start_date"].replace("Z", "+00:00")) - now).days
                score *= 1.3 if days <= 7 else 1.0
            elif intent == "find_popular":
                score *= 1 + 0.5 * (event.get("registrations") or 0) / max_regs
            elif intent == "find_online":
                score *= 1.5 if event.get("is_online") else 0.6
            results.append({"event_id": event["id"], "score": round(float(min(score, 1.0)), 4)})

        results.sort(key=lambda r: r["score"], reverse=True)
        return {
            "results": results[:20],
            "processed_query": " ".join(tokens),
            "suggestions": [] if results else self._suggestions(query),
        }

    @staticmethod
    def _suggestions(query: str) -> list[str]:
        base = ["hackathon", "workshop", "music", "sports", "careers"]
        return [s for s in base if s not in query.lower()][:3]
