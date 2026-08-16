from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Set

import cv2
from ultralytics import YOLO
from .publisher import VisionPublisher


def load_environment_file() -> None:
    """Load local defaults without replacing launcher-specific camera values."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_environment_file()

CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
MODEL_NAME = "yolo26n.pt"

FRAME_WIDTH = 1280
FRAME_HEIGHT = 720

LINE_X_RATIO = 0.55
CONFIDENCE = 0.35
EVENT_BANNER_SECONDS = 2.0


@dataclass
class TrackState:
    previous_x: int
    last_seen: float


def draw_direction_guide(frame, line_x: int) -> None:
    """Make the meaning of each side and crossing direction obvious."""
    height, width = frame.shape[:2]
    overlay = frame.copy()

    cv2.rectangle(overlay, (0, 0), (line_x, height), (0, 90, 180), -1)
    cv2.rectangle(overlay, (line_x, 0), (width, height), (0, 135, 0), -1)
    cv2.addWeighted(overlay, 0.12, frame, 0.88, 0, frame)

    label_y = max(55, height - 35)
    cv2.putText(
        frame,
        "<- LEFT SIDE / EXIT",
        (25, label_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (0, 165, 255),
        2,
    )

    enter_label = "RIGHT SIDE / ENTER ->"
    (text_width, _), _ = cv2.getTextSize(
        enter_label, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2
    )
    cv2.putText(
        frame,
        enter_label,
        (max(line_x + 25, width - text_width - 25), label_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (0, 255, 0),
        2,
    )

    arrow_y = max(185, height // 2)
    arrow_length = min(150, max(70, width // 8))
    cv2.arrowedLine(
        frame,
        (line_x - arrow_length, arrow_y - 28),
        (line_x - 12, arrow_y - 28),
        (0, 255, 0),
        4,
        tipLength=0.2,
    )
    cv2.putText(
        frame,
        "ENTER",
        (line_x - arrow_length, arrow_y - 42),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (0, 255, 0),
        2,
    )
    cv2.arrowedLine(
        frame,
        (line_x + arrow_length, arrow_y + 28),
        (line_x + 12, arrow_y + 28),
        (0, 165, 255),
        4,
        tipLength=0.2,
    )
    cv2.putText(
        frame,
        "EXIT",
        (line_x + 45, arrow_y + 55),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (0, 165, 255),
        2,
    )


def draw_event_banner(frame, event_text: str) -> None:
    """Show the latest crossing prominently without hiding the video."""
    height, width = frame.shape[:2]
    (text_width, text_height), _ = cv2.getTextSize(
        event_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2
    )
    x1 = max(10, (width - text_width) // 2 - 18)
    y1 = max(10, height - 105)
    x2 = min(width - 10, x1 + text_width + 36)
    y2 = min(height - 10, y1 + text_height + 34)
    cv2.rectangle(frame, (x1, y1), (x2, y2), (20, 20, 20), -1)
    color = (0, 255, 0) if event_text.startswith("ENTER") else (0, 165, 255)
    cv2.putText(
        frame,
        event_text,
        (x1 + 18, y2 - 15),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        color,
        2,
    )


def main() -> None:
    model = YOLO(MODEL_NAME)
    publisher = VisionPublisher.from_environment()
    if publisher is not None:
        publisher.start()

    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)

    if not cap.isOpened():
        raise RuntimeError(
            f"Cannot open camera index {CAMERA_INDEX}. "
            "Try camera index 0, 1, or 2."
        )

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, 30)

    # Let USB cameras finish auto-exposure and reject endpoints that open but
    # only return black frames (some devices expose multiple DirectShow pins).
    startup_frame = None
    for _ in range(30):
        success, candidate = cap.read()
        if success:
            startup_frame = candidate
        time.sleep(0.03)

    if startup_frame is None or float(startup_frame.std()) < 2.0:
        cap.release()
        raise RuntimeError(
            f"Camera index {CAMERA_INDEX} opened but returned a black or "
            "invalid video stream. Try -CameraIndex 0 or -CameraIndex 2."
        )

    entered = 0
    exited = 0

    track_states: Dict[int, TrackState] = {}
    counted_entry: Set[int] = set()
    counted_exit: Set[int] = set()
    latest_event_text = ""
    latest_event_time = 0.0

    frame = startup_frame
    while True:
        success = frame is not None

        if not success:
            print("Unable to read camera frame.")
            break

        height, width = frame.shape[:2]
        line_x = int(width * LINE_X_RATIO)

        results = model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            classes=[0],
            conf=CONFIDENCE,
            verbose=False,
        )

        result = results[0]
        annotated_frame = result.plot()

        boxes = result.boxes
        active_tracks = []
        crossing_events = []

        if (
            boxes is not None
            and boxes.id is not None
            and boxes.xyxy is not None
        ):
            track_ids = boxes.id.int().cpu().tolist()
            coordinates = boxes.xyxy.int().cpu().tolist()
            confidences = boxes.conf.cpu().tolist()

            current_time = time.time()

            for track_id, box, confidence in zip(
                track_ids, coordinates, confidences
            ):
                x1, y1, x2, y2 = box

                center_x = int((x1 + x2) / 2)
                center_y = int((y1 + y2) / 2)
                active_tracks.append(
                    {
                        "trackId": track_id,
                        "x": max(0.0, min(1.0, center_x / width)),
                        "y": max(0.0, min(1.0, center_y / height)),
                        "confidence": max(0.0, min(1.0, confidence)),
                    }
                )

                cv2.circle(
                    annotated_frame,
                    (center_x, center_y),
                    5,
                    (255, 255, 255),
                    -1,
                )

                previous_state = track_states.get(track_id)

                if previous_state is not None:
                    previous_x = previous_state.previous_x

                    crossed_right = (
                        previous_x < line_x
                        and center_x >= line_x
                    )

                    crossed_left = (
                        previous_x > line_x
                        and center_x <= line_x
                    )

                    if crossed_right and track_id not in counted_entry:
                        entered += 1
                        counted_entry.add(track_id)
                        latest_event_text = (
                            f"ENTER -> RIGHT | Person #{track_id}"
                        )
                        latest_event_time = current_time

                        # Allow the same person to exit later.
                        counted_exit.discard(track_id)

                        print(
                            f"ENTRY | Track ID: {track_id} | "
                            f"Entered: {entered}"
                        )
                        occurred_at = datetime.now().astimezone().isoformat()
                        crossing_events.append(
                            {
                                "eventId": (
                                    f"{track_id}-{time.time_ns()}-enter"
                                ),
                                "trackId": track_id,
                                "direction": "ENTER",
                                "confidence": confidence,
                                "occurredAt": occurred_at,
                            }
                        )

                    elif crossed_left and track_id not in counted_exit:
                        exited += 1
                        counted_exit.add(track_id)
                        latest_event_text = (
                            f"EXIT <- LEFT | Person #{track_id}"
                        )
                        latest_event_time = current_time

                        # Allow the same person to enter later.
                        counted_entry.discard(track_id)

                        print(
                            f"EXIT | Track ID: {track_id} | "
                            f"Exited: {exited}"
                        )
                        occurred_at = datetime.now().astimezone().isoformat()
                        crossing_events.append(
                            {
                                "eventId": f"{track_id}-{time.time_ns()}-exit",
                                "trackId": track_id,
                                "direction": "EXIT",
                                "confidence": confidence,
                                "occurredAt": occurred_at,
                            }
                        )

                track_states[track_id] = TrackState(
                    previous_x=center_x,
                    last_seen=current_time,
                )

            # Remove tracks not seen for 10 seconds.
            expired_ids = [
                track_id
                for track_id, state in track_states.items()
                if current_time - state.last_seen > 10
            ]

            for track_id in expired_ids:
                track_states.pop(track_id, None)
                counted_entry.discard(track_id)
                counted_exit.discard(track_id)

        occupancy = max(0, entered - exited)
        if publisher is not None:
            publisher.submit(
                {
                    "entered": entered,
                    "exited": exited,
                    "currentOccupancy": occupancy,
                    "activeTracks": active_tracks,
                    "timestamp": datetime.now().astimezone().isoformat(),
                },
                crossing_events,
            )

        draw_direction_guide(annotated_frame, line_x)

        cv2.line(
            annotated_frame,
            (line_x, 0),
            (line_x, height),
            (0, 255, 255),
            3,
        )

        cv2.putText(
            annotated_frame,
            "CROSSING LINE",
            (min(line_x + 15, max(20, width - 190)), 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2,
        )

        cv2.rectangle(
            annotated_frame,
            (20, 20),
            (360, 155),
            (0, 0, 0),
            -1,
        )

        cv2.putText(
            annotated_frame,
            f"Entered: {entered}",
            (40, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 255, 0),
            2,
        )

        cv2.putText(
            annotated_frame,
            f"Exited: {exited}",
            (40, 100),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 165, 255),
            2,
        )

        cv2.putText(
            annotated_frame,
            f"Current occupancy: {occupancy}",
            (40, 140),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2,
        )

        if (
            latest_event_text
            and time.time() - latest_event_time <= EVENT_BANNER_SECONDS
        ):
            draw_event_banner(annotated_frame, latest_event_text)

        cv2.imshow(
            "Retail Digital Twin - Entry Exit Counter",
            annotated_frame,
        )

        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break

        if key == ord("r"):
            entered = 0
            exited = 0
            track_states.clear()
            counted_entry.clear()
            counted_exit.clear()
            latest_event_text = ""
            latest_event_time = 0.0
            print("Counters reset.")

        success, frame = cap.read()

    cap.release()
    cv2.destroyAllWindows()
    if publisher is not None:
        publisher.close()


if __name__ == "__main__":
    main()
