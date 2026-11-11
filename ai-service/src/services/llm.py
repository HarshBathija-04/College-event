"""
Groq-powered language features.

* chat()     - campus concierge that answers questions using only the events
               the backend passes in (no hallucinated events).
* describe() - drafts a description, tagline and tags for organizers.

Both return parsed JSON. Errors are mapped to LLMError with an HTTP status
so the API layer can answer cleanly (429 when rate limited, 503 when no key).
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import groq

logger = logging.getLogger(__name__)

TEXT_MODEL = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")


class LLMError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


_client: groq.Groq | None = None


def is_configured() -> bool:
    return bool(os.getenv("GROQ_API_KEY"))


def _get_client() -> groq.Groq:
    global _client
    if not is_configured():
        raise LLMError(503, "AI assistant is not configured")
    if _client is None:
        _client = groq.Groq(api_key=os.environ["GROQ_API_KEY"], timeout=25.0, max_retries=1)
    return _client


def _complete_json(messages: list[dict[str, str]], max_tokens: int = 900) -> dict[str, Any]:
    try:
        completion = _get_client().chat.completions.create(
            model=TEXT_MODEL,
            messages=messages,
            temperature=0.4,
            max_completion_tokens=max_tokens,
            reasoning_effort="low",
            response_format={"type": "json_object"},
        )
    except groq.RateLimitError as exc:
        logger.warning("Groq rate limit hit")
        raise LLMError(429, "AI assistant is busy, please retry shortly") from exc
    except (groq.APIConnectionError, groq.APITimeoutError) as exc:
        logger.warning("Groq unreachable: %s", exc)
        raise LLMError(502, "AI provider is unreachable") from exc
    except groq.APIStatusError as exc:
        logger.warning("Groq error %s", exc.status_code)
        raise LLMError(502, "AI provider returned an error") from exc

    content = completion.choices[0].message.content or ""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.S)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {"reply": content.strip()}


def _zone(tz: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz) if tz else ZoneInfo("UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def _human(dt: str, zone: ZoneInfo | None = None) -> str:
    """Pre-format dates in the viewer's timezone so the model never computes weekdays or offsets."""
    zone = zone or ZoneInfo("UTC")
    try:
        d = datetime.fromisoformat(dt.replace("Z", "+00:00")).astimezone(zone)
    except ValueError:
        return dt
    return d.strftime("%a %d %b, %I:%M %p").replace(" 0", " ")


def _event_line(e: dict[str, Any], zone: ZoneInfo) -> str:
    seats = ""
    if e.get("max_participants"):
        left = max(0, e["max_participants"] - (e.get("registrations") or 0))
        seats = f" | seats left: {left}"
    where = "Online" if e.get("is_online") else e.get("venue", "")
    return (
        f"- id={e['id']} | {e['title']} | {e.get('category', '')}/{e.get('type', '')} | "
        f"starts {_human(e['start_date'], zone)} | ends {_human(e['end_date'], zone)} | {where}{seats} | "
        f"{(e.get('short_description') or e.get('description', ''))[:160]}"
    )


def chat(
    message: str,
    history: list[dict[str, str]],
    events: list[dict[str, Any]],
    user: dict[str, Any] | None,
    now: str,
    tz: str | None = None,
) -> dict[str, Any]:
    zone = _zone(tz)
    who = ""
    if user:
        interests = ", ".join(user.get("interests") or []) or "not set"
        name = user.get("first_name", "a student")
        dept = user.get("department") or "no department"
        who = f"The student is {name} ({dept}), interests: {interests}.\n"

    system = (
        "You are Quad, the friendly events concierge for a college campus. "
        "Answer ONLY using the events listed below; if nothing fits, say so and suggest the closest options. "
        "Never invent events, dates, venues or links. Copy dates exactly as written in the list "
        "(you may drop the year). Keep replies under 120 words, plain text, no markdown tables.\n"
        f"Current time: {_human(now, zone)} ({zone.key}). All times below are in that timezone.\n{who}"
        'Respond as a JSON object: {"reply": string, "event_ids": string[]} where event_ids are the ids '
        "of up to 4 events you mention, most relevant first.\n\n"
        "Upcoming events:\n" + ("\n".join(_event_line(e, zone) for e in events) or "(no upcoming events)")
    )
    messages = [{"role": "system", "content": system}]
    messages += [
        {"role": h["role"], "content": h["content"][:2000]} for h in history if h.get("role") in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": message})

    data = _complete_json(messages)
    reply = str(data.get("reply") or "").strip() or "Sorry, I could not come up with an answer. Try rephrasing?"
    known = {e["id"] for e in events}
    ids = [i for i in data.get("event_ids") or [] if isinstance(i, str) and i in known]
    return {"reply": reply, "event_ids": ids[:4]}


def describe(title: str, event_type: str, notes: str, venue: str) -> dict[str, Any]:
    system = (
        "You write event listings for a college events platform. "
        "Write in a warm, clear, professional voice for students. "
        "Use only facts the organizer gave; do not invent speakers, prizes, dates or numbers. "
        'Respond as JSON: {"description": string (90-160 words, 2 short paragraphs, plain text), '
        '"short_description": string (max 90 characters, no trailing period), '
        '"tags": string[] (3-5 lowercase tags, 1-2 words each)}.'
    )
    user = f"Title: {title}\nType: {event_type}\nVenue: {venue or 'not specified'}\nOrganizer notes: {notes or 'none'}"
    data = _complete_json([{"role": "system", "content": system}, {"role": "user", "content": user}], max_tokens=700)

    tags = [str(t).strip().lower()[:30] for t in (data.get("tags") or []) if str(t).strip()][:5]
    description = str(data.get("description") or data.get("reply") or "").strip()
    if not description:
        raise LLMError(502, "AI provider returned an empty draft")
    return {
        "description": description[:5000],
        "short_description": str(data.get("short_description") or "").strip()[:255],
        "tags": tags,
    }
