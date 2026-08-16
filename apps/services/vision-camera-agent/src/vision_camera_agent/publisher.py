"""Non-blocking publisher for lightweight retail tracking data (never video frames)."""

from __future__ import annotations

import logging
import os
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Any

import requests


LOGGER = logging.getLogger("vision-publisher")


@dataclass(frozen=True)
class PublisherConfig:
    api_url: str
    api_key: str
    store_id: str
    camera_id: str
    interval_seconds: float
    request_timeout_seconds: float = 2.0
    max_event_queue: int = 1_000


class VisionPublisher:
    """Publishes the newest position snapshot and reliably retries queued events."""

    def __init__(self, config: PublisherConfig) -> None:
        self._config = config
        self._condition = threading.Condition()
        self._latest: dict[str, Any] | None = None
        self._events: deque[dict[str, Any]] = deque()
        self._stopping = False
        self._connection_logged = False
        self._thread = threading.Thread(
            target=self._run, name="vision-api-publisher", daemon=True
        )

    @classmethod
    def from_environment(cls) -> VisionPublisher | None:
        api_key = os.getenv("CAMERA_API_KEY")
        if not api_key:
            LOGGER.warning("CAMERA_API_KEY is not set; backend publishing is disabled")
            return None
        interval_ms = max(100, int(os.getenv("PUBLISH_INTERVAL_MS", "500")))
        return cls(
            PublisherConfig(
                api_url=os.getenv(
                    "VISION_API_URL", "http://localhost:3335/api/v1"
                ).rstrip("/"),
                api_key=api_key,
                store_id=os.getenv("STORE_ID", "store-01"),
                camera_id=os.getenv("CAMERA_ID", "store-01-entry"),
                interval_seconds=interval_ms / 1_000,
            )
        )

    def start(self) -> None:
        LOGGER.warning(
            "Publisher enabled: %s -> %s/%s",
            self._config.camera_id,
            self._config.api_url,
            "tracking/updates",
        )
        self._thread.start()

    def submit(
        self, snapshot: dict[str, Any], events: list[dict[str, Any]] | None = None
    ) -> None:
        with self._condition:
            self._latest = snapshot
            for event in events or []:
                if len(self._events) >= self._config.max_event_queue:
                    LOGGER.error(
                        "Event retry queue is full; event %s was not accepted",
                        event.get("eventId"),
                    )
                    continue
                self._events.append(event)
            self._condition.notify()

    def close(self) -> None:
        with self._condition:
            self._stopping = True
            pending_events = len(self._events)
            self._condition.notify()
        self._thread.join(timeout=3)
        if pending_events:
            LOGGER.warning(
                "Publisher stopped with %d crossing event(s) still queued",
                pending_events,
            )

    def _run(self) -> None:
        session = requests.Session()
        backoff = self._config.interval_seconds
        next_publish = 0.0
        while True:
            with self._condition:
                if self._stopping:
                    return
                wait_for = max(0.0, next_publish - time.monotonic())
                if self._latest is None:
                    self._condition.wait(timeout=1.0)
                    continue
                if wait_for:
                    self._condition.wait(timeout=wait_for)
                    continue
                snapshot = dict(self._latest)
                queued_events = list(self._events)[:50]

            payload = {
                "cameraId": self._config.camera_id,
                "storeId": self._config.store_id,
                **snapshot,
                "events": queued_events,
            }
            try:
                response = session.post(
                    f"{self._config.api_url}/tracking/updates",
                    json=payload,
                    headers={"X-Camera-Api-Key": self._config.api_key},
                    timeout=self._config.request_timeout_seconds,
                )
                response.raise_for_status()
                if not self._connection_logged:
                    LOGGER.warning(
                        "Publisher connected; camera updates are reaching the API"
                    )
                    self._connection_logged = True
                accepted_ids = {event["eventId"] for event in queued_events}
                with self._condition:
                    self._events = deque(
                        event
                        for event in self._events
                        if event.get("eventId") not in accepted_ids
                    )
                backoff = self._config.interval_seconds
                next_publish = time.monotonic() + self._config.interval_seconds
            except requests.RequestException as error:
                LOGGER.warning("Tracking API publish failed: %s", error)
                next_publish = time.monotonic() + backoff
                backoff = min(backoff * 2, 30.0)
