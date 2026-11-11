"""
Hybrid recommendation engine.

The backend sends the candidate events (it owns the data); this module scores
them by blending three signals:

* content  (50%) - does the event's category match the user's interests?
* popularity (30%) - how many seats are already taken, relative to the busiest event
* time-aware (20%) - events in the next 14 days get a boost, sooner is better
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

WEIGHTS = {"content": 0.5, "popularity": 0.3, "time": 0.2}
TIME_WINDOW_DAYS = 14


def _parse(dt: str) -> datetime:
    return datetime.fromisoformat(dt.replace("Z", "+00:00"))


class RecommendationEngine:
    def get_recommendations(
        self,
        user_features: dict[str, Any],
        events: list[dict[str, Any]],
        exclude_event_ids: list[str],
        limit: int = 10,
        now: datetime | None = None,
    ) -> list[dict[str, Any]]:
        now = now or datetime.now(UTC)
        excluded = set(exclude_event_ids)
        preferred = set(user_features.get("preferred_categories") or [])
        candidates = [e for e in events if e["id"] not in excluded and _parse(e["end_date"]) >= now]
        if not candidates:
            return []

        max_regs = max((e.get("registrations") or 0) for e in candidates) or 1
        scored = []
        for event in candidates:
            signals = {
                "content": 1.0 if event.get("category_id") in preferred else 0.0,
                "popularity": (event.get("registrations") or 0) / max_regs,
                "time": self._time_score(_parse(event["start_date"]), now),
            }
            score = sum(WEIGHTS[k] * v for k, v in signals.items())
            top = max(signals, key=lambda k: WEIGHTS[k] * signals[k])
            scored.append(
                {
                    "event_id": event["id"],
                    "score": round(score, 4),
                    "reason": self._reason(top, signals, event, now),
                    "algorithm": {"content": "content-based", "popularity": "popularity", "time": "time-aware"}[top],
                }
            )

        scored.sort(key=lambda r: r["score"], reverse=True)
        return scored[:limit]

    @staticmethod
    def _time_score(start: datetime, now: datetime) -> float:
        days = (start - now).total_seconds() / 86400
        if days < 0:  # already running
            return 1.0
        if days > TIME_WINDOW_DAYS:
            return 0.0
        return 1.0 - days / TIME_WINDOW_DAYS

    @staticmethod
    def _reason(top: str, signals: dict[str, float], event: dict[str, Any], now: datetime) -> str:
        if top == "content" and signals["content"]:
            return f"Matches your interest in {event.get('category', 'this category')}"
        if top == "time" and signals["time"]:
            hours = (_parse(event["start_date"]) - now).total_seconds() / 3600
            if hours <= 0:
                return "Happening now"
            if hours < 24:
                return f"Starts in {max(1, round(hours))}h"
            days = round(hours / 24)
            return f"In {days} day{'s' if days != 1 else ''}"
        return "Popular with students"
