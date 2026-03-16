# server.py
import struct
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from wyoming.client import AsyncTcpClient
from wyoming.event import Event

PIPER_HOST  = "piper"
PIPER_PORT  = 10200
SAMPLE_RATE = 22050
CHANNELS    = 1
BITS        = 16

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def wav_header(sample_rate=22050, channels=1, bits=16):
    datasize = 0x7FFFFFFF
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", datasize + 36, b"WAVE",
        b"fmt ", 16, 1, channels, sample_rate,
        sample_rate * channels * bits // 8,
        channels * bits // 8, bits,
        b"data", datasize,
    )


async def stream_tts(text: str):
    client = AsyncTcpClient(PIPER_HOST, PIPER_PORT)
    await client.connect()

    try:
        await client.write_event(Event(type="synthesize", data={"text": text}))

        # Send WAV header first so browser can start playing immediately
        yield wav_header(SAMPLE_RATE, CHANNELS, BITS)

        # Stream chunks as Piper produces them
        while True:
            response = await client.read_event()
            if response is None or response.type == "audio-stop":
                break
            if response.type == "audio-chunk":
                yield response.payload
    finally:
        await client.disconnect()


@app.get("/tts")
async def tts(text: str):
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    return StreamingResponse(stream_tts(text), media_type="audio/wav")


@app.get("/health")
async def health():
    return {"status": "ok"}