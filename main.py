"""
EmotionAI Backend — FastAPI server for facial emotion detection
Uses DeepFace with FER2013 model for server-side inference
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import base64
import io
import time
import json
from datetime import datetime
from collections import defaultdict
from typing import Optional
from pydantic import BaseModel

app = FastAPI(
    title="EmotionAI API",
    description="Real-time facial emotion detection API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Try importing DeepFace (optional — falls back to OpenCV + CNN)
# ─────────────────────────────────────────────
try:
    from deepface import DeepFace
    BACKEND = "deepface"
    print("✅ DeepFace loaded successfully")
except ImportError:
    try:
        from fer import FER
        emotion_detector = FER(mtcnn=True)
        BACKEND = "fer"
        print("✅ FER loaded successfully")
    except ImportError:
        BACKEND = "opencv"
        print("⚠️  Using OpenCV fallback — install deepface or fer for better accuracy")

# ─────────────────────────────────────────────
# In-memory session store (no persistence by default)
# ─────────────────────────────────────────────
sessions: dict[str, list] = defaultdict(list)


class DetectRequest(BaseModel):
    image: str          # base64 encoded JPEG/PNG
    session_id: Optional[str] = "default"
    mode: Optional[str] = "normal"   # normal | interview | classroom


EMOTION_KEYS = ["happy", "sad", "angry", "neutral", "surprised", "fearful", "disgusted"]


def decode_image(b64_image: str) -> np.ndarray:
    """Decode a base64 image string to OpenCV BGR array."""
    if "," in b64_image:
        b64_image = b64_image.split(",")[1]
    img_bytes = base64.b64decode(b64_image)
    img_array = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def detect_with_deepface(img: np.ndarray) -> list[dict]:
    """Detect faces and emotions using DeepFace."""
    results = DeepFace.analyze(
        img,
        actions=["emotion"],
        enforce_detection=False,
        detector_backend="opencv",
        silent=True
    )
    if not isinstance(results, list):
        results = [results]

    faces = []
    for r in results:
        region = r.get("region", {})
        emotions_raw = r.get("emotion", {})
        # Normalize to 0-1
        total = sum(emotions_raw.values()) or 1
        emotions = {k.lower(): v / total for k, v in emotions_raw.items()}
        # Map DeepFace keys to our standard keys
        mapped = {
            "happy": emotions.get("happy", 0),
            "sad": emotions.get("sad", 0),
            "angry": emotions.get("angry", 0),
            "neutral": emotions.get("neutral", 0),
            "surprised": emotions.get("surprise", emotions.get("surprised", 0)),
            "fearful": emotions.get("fear", emotions.get("fearful", 0)),
            "disgusted": emotions.get("disgust", emotions.get("disgusted", 0)),
        }
        faces.append({
            "box": {
                "x": region.get("x", 0),
                "y": region.get("y", 0),
                "w": region.get("w", 0),
                "h": region.get("h", 0),
            },
            "emotions": mapped,
            "dominant": max(mapped, key=mapped.get),
            "confidence": max(mapped.values()),
        })
    return faces


def detect_with_fer(img: np.ndarray) -> list[dict]:
    """Detect faces and emotions using FER library."""
    detections = emotion_detector.detect_emotions(img)
    faces = []
    for det in detections:
        box = det.get("box", [0, 0, 0, 0])
        emotions_raw = det.get("emotions", {})
        total = sum(emotions_raw.values()) or 1
        emotions = {
            "happy": emotions_raw.get("happy", 0) / total,
            "sad": emotions_raw.get("sad", 0) / total,
            "angry": emotions_raw.get("angry", 0) / total,
            "neutral": emotions_raw.get("neutral", 0) / total,
            "surprised": emotions_raw.get("surprise", 0) / total,
            "fearful": emotions_raw.get("fear", 0) / total,
            "disgusted": emotions_raw.get("disgust", 0) / total,
        }
        faces.append({
            "box": {"x": box[0], "y": box[1], "w": box[2], "h": box[3]},
            "emotions": emotions,
            "dominant": max(emotions, key=emotions.get),
            "confidence": max(emotions.values()),
        })
    return faces


def detect_with_opencv(img: np.ndarray) -> list[dict]:
    """Fallback: detect face with OpenCV Haar cascade, return neutral emotions."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces_detected = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    faces = []
    for (x, y, w, h) in faces_detected:
        emotions = {e: 1/7 for e in EMOTION_KEYS}
        emotions["neutral"] = 0.4
        emotions["happy"] = 0.2
        total = sum(emotions.values())
        emotions = {k: v/total for k, v in emotions.items()}
        faces.append({
            "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
            "emotions": emotions,
            "dominant": "neutral",
            "confidence": 0.4,
        })
    return faces


@app.get("/")
async def root():
    return {"status": "ok", "backend": BACKEND, "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy", "backend": BACKEND, "timestamp": datetime.utcnow().isoformat()}


@app.post("/detect_emotion")
async def detect_emotion(request: DetectRequest):
    """
    Detect emotions from a base64-encoded image frame.

    Returns:
        faces: list of detected face objects with bounding boxes and emotion scores
        backend: which model was used
        latency_ms: processing time
    """
    t_start = time.perf_counter()
    try:
        img = decode_image(request.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    try:
        if BACKEND == "deepface":
            faces = detect_with_deepface(img)
        elif BACKEND == "fer":
            faces = detect_with_fer(img)
        else:
            faces = detect_with_opencv(img)
    except Exception as e:
        # Return empty face list on model error — don't crash the client
        faces = []

    # Log to session
    if faces and request.session_id:
        sessions[request.session_id].append({
            "timestamp": datetime.utcnow().isoformat(),
            "dominant": faces[0]["dominant"],
            "confidence": faces[0]["confidence"],
            "emotions": faces[0]["emotions"],
        })

    latency = round((time.perf_counter() - t_start) * 1000, 1)

    return JSONResponse({
        "faces": faces,
        "face_count": len(faces),
        "backend": BACKEND,
        "latency_ms": latency,
        "session_id": request.session_id,
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/session_summary/{session_id}")
async def session_summary(session_id: str, mode: str = "normal"):
    """
    Compute session analytics for a given session_id.

    Returns:
        dominant_emotion, emotion_distribution, engagement_score,
        stability_score, mode-specific insights
    """
    log = sessions.get(session_id, [])
    if not log:
        raise HTTPException(status_code=404, detail="No session data found")

    # Aggregate emotion distribution
    totals = defaultdict(float)
    for entry in log:
        for e, v in entry["emotions"].items():
            totals[e] += v

    frame_count = len(log)
    distribution = {e: round(totals[e] / frame_count, 4) for e in EMOTION_KEYS}
    dominant = max(distribution, key=distribution.get)

    # Stability: how often dominant emotion changed
    emotions_over_time = [e["dominant"] for e in log]
    changes = sum(1 for i in range(1, len(emotions_over_time)) if emotions_over_time[i] != emotions_over_time[i-1])
    stability_score = max(0, round(100 - (changes / max(frame_count, 1)) * 100))

    # Engagement: non-neutral frames
    engaged_frames = sum(1 for e in log if e["dominant"] != "neutral")
    engagement_score = round((engaged_frames / max(frame_count, 1)) * 100)

    # Mode-specific insights
    insights = {}
    if mode == "interview":
        happy = distribution.get("happy", 0)
        neutral = distribution.get("neutral", 0)
        fearful = distribution.get("fearful", 0)
        angry = distribution.get("angry", 0)
        insights["confidence_level"] = min(100, round((happy * 0.8 + neutral * 0.5 - fearful * 0.6 - angry * 0.4) * 100 + 50))
        insights["stress_level"] = min(100, round((fearful * 0.7 + angry * 0.5) * 100))
        insights["composure"] = round(neutral * 100)
    elif mode == "classroom":
        happy = distribution.get("happy", 0)
        neutral = distribution.get("neutral", 0)
        surprised = distribution.get("surprised", 0)
        sad = distribution.get("sad", 0)
        insights["attention_level"] = min(100, round((neutral * 0.6 + surprised * 0.8 + happy * 0.5 - sad * 0.4) * 100 + 50))
        insights["boredom_index"] = min(100, round((sad * 0.6 + neutral * 0.3) * 100))
        insights["positive_affect"] = round(happy * 100)

    return JSONResponse({
        "session_id": session_id,
        "frame_count": frame_count,
        "duration_seconds": frame_count / 15,
        "dominant_emotion": dominant,
        "emotion_distribution": distribution,
        "engagement_score": engagement_score,
        "stability_score": stability_score,
        "mode": mode,
        "insights": insights,
        "generated_at": datetime.utcnow().isoformat(),
    })


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear session data (privacy compliance)."""
    if session_id in sessions:
        del sessions[session_id]
    return {"cleared": True, "session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
