"""Report which OpenCV camera index/backend returns usable image frames."""

import time

import cv2


def main() -> None:
    backends = (
        ("DSHOW", cv2.CAP_DSHOW),
        ("MSMF", cv2.CAP_MSMF),
        ("AUTO", cv2.CAP_ANY),
    )
    for backend_name, backend in backends:
        for index in range(4):
            capture = cv2.VideoCapture(index, backend)
            opened = capture.isOpened()
            success = False
            frame = None
            if opened:
                for _ in range(20):
                    success, frame = capture.read()
                    time.sleep(0.03)
            if success and frame is not None:
                print(
                    f"{backend_name} index={index}: frame={frame.shape} "
                    f"mean={frame.mean():.2f} std={frame.std():.2f} "
                    f"range={frame.min()}-{frame.max()}"
                )
            else:
                state = "NO_FRAME" if opened else "CLOSED"
                print(f"{backend_name} index={index}: {state}")
            capture.release()


if __name__ == "__main__":
    main()
