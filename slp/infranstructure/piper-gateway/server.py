# server.py
import struct
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from wyoming.client import AsyncTcpClient
from wyoming.event import Event

PIPER_HOST = "piper"
PIPER_PORT = 10200

SAMPLE_RATE = 22050
CHANNELS = 1
BITS = 16

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
    try:
        client = AsyncTcpClient(PIPER_HOST, PIPER_PORT)
        await client.connect()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to Piper: {e}")

    try:
        event = Event(type="synthesize", data={"text": text})
        await client.write_event(event)

        yield wav_header(SAMPLE_RATE, CHANNELS, BITS)

        while True:
            response = await client.read_event()
            if response is None:
                break
            if response.type == "audio-chunk":
                yield response.payload
            if response.type == "audio-stop":
                break
    except Exception as e:
        raise RuntimeError(f"Piper stream error: {e}")
    finally:
        await client.disconnect()


@app.get("/tts")
async def tts(text: str):
    gen = stream_tts(text)
    try:
        first_chunk = await gen.__anext__()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    async def chained():
        yield first_chunk
        async for chunk in gen:
            yield chunk

    return StreamingResponse(chained(), media_type="audio/wav")


@app.get("/health")
async def health():
    return {"status": "ok"}