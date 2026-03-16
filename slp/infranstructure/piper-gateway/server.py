import struct
from fastapi import FastAPI
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

# Allow CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def wav_header(sample_rate=22050, channels=1, bits=16):
    datasize = 0x7fffffff
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        datasize + 36,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        sample_rate * channels * bits // 8,
        channels * bits // 8,
        bits,
        b"data",
        datasize,
    )


async def stream_tts(text: str):
    client = AsyncTcpClient(PIPER_HOST, PIPER_PORT)
    await client.connect()

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

    await client.disconnect()


@app.get("/tts")
async def tts(text: str):
    return StreamingResponse(
        stream_tts(text),
        media_type="audio/wav"
    )