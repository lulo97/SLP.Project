"""
piper-gateway/server.py

FastAPI gateway in front of the Piper TTS container.

Endpoints
---------
GET  /health          — always 200; reports piper_enabled + cache_dir
GET  /tts?text=...    — cache-first synthesis (used by frontend/browser)
POST /tts  { text }   — same logic, JSON body (used by backend services)

Cache
-----
Key: SHA-256(text.encode()).hexdigest() + ".wav"  stored in TTS_CACHE_DIR
A cache hit is served even when Piper is offline (PIPER_ENABLED=false).
A cache miss with PIPER_ENABLED=false returns 503.

Environment variables
---------------------
PIPER_HOST            Piper container hostname      (default: piper)
PIPER_PORT            Wyoming TCP port              (default: 10200)
PIPER_ENABLED         "true"/"false"                (default: true)
TTS_CACHE_DIR         Directory for .wav cache      (default: /cache/tts)
"""

import hashlib
import io
import os
import wave
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from wyoming.audio import AudioChunk, AudioStart, AudioStop
from wyoming.client import AsyncTcpClient
from wyoming.tts import Synthesize

# ── Configuration ─────────────────────────────────────────────────────────────
PIPER_HOST    = os.getenv("PIPER_HOST", "piper")
PIPER_PORT    = int(os.getenv("PIPER_PORT", "10200"))
PIPER_ENABLED = os.getenv("PIPER_ENABLED", "true").lower() == "true"
TTS_CACHE_DIR = Path(os.getenv("TTS_CACHE_DIR", "/cache/tts"))

TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="piper-gateway")


# ── Models ────────────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def cache_path_for(text: str) -> Path:
    key = hashlib.sha256(text.encode("utf-8")).hexdigest() + ".wav"
    return TTS_CACHE_DIR / key


async def synthesize_with_piper(text: str) -> bytes:
    chunks: list[bytes] = []
    audio_format: dict = {}

    async with AsyncTcpClient(PIPER_HOST, PIPER_PORT) as client:
        await client.write_event(Synthesize(text=text).event())

        while True:
            event = await client.read_event()
            if event is None:
                break
            if AudioStart.is_type(event.type):
                start = AudioStart.from_event(event)
                audio_format = {
                    "rate":     start.rate,
                    "width":    start.width,
                    "channels": start.channels,
                }
            elif AudioChunk.is_type(event.type):
                chunks.append(AudioChunk.from_event(event).audio)
            elif AudioStop.is_type(event.type):
                break

    raw_pcm  = b"".join(chunks)
    rate     = audio_format.get("rate",     22050)
    width    = audio_format.get("width",    2)
    channels = audio_format.get("channels", 1)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(width)
        wf.setframerate(rate)
        wf.writeframes(raw_pcm)
    return buf.getvalue()


async def handle_tts(text: str) -> Response:
    """Shared logic for both GET and POST /tts."""
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    cached = cache_path_for(text)

    # 1. Cache hit — serve immediately regardless of PIPER_ENABLED
    if cached.exists():
        return FileResponse(
            path=str(cached),
            media_type="audio/wav",
            headers={"X-Cache": "HIT"},
        )

    # 2. Cache miss + Piper offline → 503
    if not PIPER_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="TTS service is offline and no cached audio exists for this text.",
        )

    # 3. Cache miss + Piper online → synthesise and cache
    try:
        wav_bytes = await synthesize_with_piper(text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Piper synthesis failed: {exc}") from exc

    # Atomic write: tmp → rename
    tmp = cached.with_suffix(".tmp")
    try:
        tmp.write_bytes(wav_bytes)
        tmp.rename(cached)
    except Exception:
        tmp.unlink(missing_ok=True)
        # Still return audio even if caching failed
        return Response(content=wav_bytes, media_type="audio/wav",
                        headers={"X-Cache": "MISS"})

    return Response(content=wav_bytes, media_type="audio/wav",
                    headers={"X-Cache": "MISS"})


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """
    Always 200. The gateway is healthy even when Piper is offline because
    cached audio can still be served.
    """
    return {
        "status":        "ok",
        "piper_enabled": PIPER_ENABLED,
        "piper_host":    PIPER_HOST,
        "piper_port":    PIPER_PORT,
        "cache_dir":     str(TTS_CACHE_DIR),
    }


@app.get("/tts")
async def tts_get(text: str = Query(..., min_length=1)):
    """
    GET /tts?text=hello+world
    Used by browser/frontend — query-string is simpler from JS fetch/XHR.
    """
    return await handle_tts(text)


@app.post("/tts")
async def tts_post(request: TTSRequest):
    """
    POST /tts  { "text": "hello world" }
    Used by backend services that prefer a JSON body.
    """
    return await handle_tts(request.text)