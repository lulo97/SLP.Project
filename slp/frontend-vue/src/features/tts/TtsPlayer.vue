<!-- src/features/tts/TtsPlayer.vue -->
<template>
  <Transition name="player">
    <div
      v-if="state !== 'idle'"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9100]
             flex items-center gap-3 px-4 py-2.5 rounded-[28px]
             bg-[#1a1a2e] text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)]
             min-w-[260px] max-w-[420px]"
      data-testid="tts-player"
    >
      <!-- Spinner while buffering -->
      <a-spin v-if="state === 'loading'" size="small" class="[&_.ant-spin-dot-item]:bg-white" />

      <!-- Play / Pause -->
      <button
        v-else
        class="flex-shrink-0 w-8 h-8 rounded-full bg-[#7c6af5] flex items-center
               justify-center border-0 cursor-pointer transition-colors hover:bg-[#6c5ce7]"
        @click="togglePause"
        data-testid="tts-player-toggle"
      >
        <Pause v-if="state === 'playing'" :size="14" />
        <Play  v-else                     :size="14" />
      </button>

      <!-- Text preview -->
      <span class="flex-1 text-xs text-white/80 truncate" data-testid="tts-player-text">
        {{ truncate(text, 48) }}
      </span>

      <!-- Error badge -->
      <span
        v-if="state === 'error'"
        class="text-[10px] text-red-300 shrink-0"
        data-testid="tts-player-error"
      >Error</span>

      <!-- Stop -->
      <button
        class="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center
               justify-center border-0 cursor-pointer transition-colors hover:bg-white/20"
        @click="stop"
        data-testid="tts-player-stop"
      >
        <X :size="12" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Play, Pause, X } from "lucide-vue-next";
import type { TtsState } from "./useTts";

defineProps<{
  state: TtsState;
  text:  string;
  error: string | null;
}>();

const emit = defineEmits<{
  togglePause: [];
  stop:        [];
}>();

const togglePause = () => emit("togglePause");
const stop        = () => emit("stop");

function truncate(t: string, max: number) {
  return t.length <= max ? t : t.slice(0, max) + "…";
}
</script>

<style scoped>
.player-enter-active { animation: playerIn  0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
.player-leave-active { animation: playerOut 0.18s ease forwards; }

@keyframes playerIn {
  from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.92); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
}
@keyframes playerOut {
  to   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.96); }
}
</style>