// src/features/tts/useTts.ts
import { ref, shallowRef } from "vue";

export type TtsState = "idle" | "loading" | "playing" | "paused" | "error";

export function useTts() {
  const state = ref<TtsState>("idle");
  const error = ref<string | null>(null);
  const audio = shallowRef<HTMLAudioElement | null>(null);
  const text  = ref<string>("");

  const TTS_BASE = import.meta.env.VITE_TTS_URL ?? "http://localhost:3005";

  // ── Keep named refs so we can removeEventListener precisely ──────────────
  let onCanPlay: (() => void)        | null = null;
  let onEnded:   (() => void)        | null = null;
  let onPause:   (() => void)        | null = null;
  let onPlay:    (() => void)        | null = null;
  let onError:   (() => void)        | null = null;

  function detachListeners(el: HTMLAudioElement) {
    if (onCanPlay) el.removeEventListener("canplay", onCanPlay);
    if (onEnded)   el.removeEventListener("ended",   onEnded);
    if (onPause)   el.removeEventListener("pause",   onPause);
    if (onPlay)    el.removeEventListener("play",    onPlay);
    if (onError)   el.removeEventListener("error",   onError);
    onCanPlay = onEnded = onPause = onPlay = onError = null;
  }

  function stop() {
    if (audio.value) {
      detachListeners(audio.value); // ← remove first, THEN clear src
      audio.value.pause();
      audio.value.src = "";        // safe now — no listeners will fire
      audio.value = null;
    }
    state.value = "idle";
    error.value = null;
    text.value  = "";
  }

  function play(inputText: string) {
    stop(); // cleans up previous instance safely

    text.value  = inputText;
    error.value = null;
    state.value = "loading";

    const url = `${TTS_BASE}/tts?text=${encodeURIComponent(inputText)}`;
    const el  = new Audio(url);
    audio.value = el;

    onCanPlay = () => {
      state.value = "playing";
      el.play().catch(() => {
        state.value = "error";
        error.value = "Playback blocked — interact with the page first.";
      });
    };
    onEnded = () => { state.value = "idle"; };
    onPause = () => { if (state.value === "playing") state.value = "paused"; };
    onPlay  = () => { state.value = "playing"; };
    onError = () => {
      state.value = "error";
      error.value = "Failed to load audio from TTS server.";
    };

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended",   onEnded);
    el.addEventListener("pause",   onPause);
    el.addEventListener("play",    onPlay);
    el.addEventListener("error",   onError);
  }

  function togglePause() {
    if (!audio.value) return;
    if (state.value === "playing") audio.value.pause();
    else if (state.value === "paused") audio.value.play();
  }

  return { state, error, text, play, togglePause, stop };
}