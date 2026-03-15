<template>
  <Teleport to="body">
    <Transition name="bubble">
      <div
        v-if="visible"
        ref="bubbleRef"
        class="selection-bubble"
        :style="bubbleStyle"
        @mousedown.prevent
      >
        <div class="bubble-bar">
          <button class="bubble-btn" @click="emit('explain', selectedText)">
            <Sparkles :size="13" />
            Explain
          </button>
          <button class="bubble-btn" @click="emit('grammar', selectedText)">
            <SpellCheck :size="13" />
            Grammar
          </button>
          <button class="bubble-btn" @click="emit('tts', selectedText)">
            <Volume2 :size="13" />
            Listen
          </button>
          <button class="bubble-btn" @click="emit('favorite', selectedText)">
            <Bookmark :size="13" />
            Save
          </button>
        </div>
        <div class="bubble-arrow" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Sparkles, SpellCheck, Volume2, Bookmark } from "lucide-vue-next";

const emit = defineEmits<{
  explain: [text: string];
  grammar: [text: string];
  tts:     [text: string];
  favorite:[text: string];
}>();

const props = defineProps<{
  containerRef?: HTMLElement | null;
}>();

const bubbleRef   = ref<HTMLElement | null>(null);
const visible     = ref(false);
const selectedText = ref("");
const position    = ref({ x: 0, y: 0 });

const BUBBLE_WIDTH  = 296;
const BUBBLE_HEIGHT = 40;

const bubbleStyle = computed(() => ({
  left: `${position.value.x}px`,
  top:  `${position.value.y}px`,
}));

function handleSelectionChange() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    visible.value = false;
    return;
  }
  const text = selection.toString().trim();
  if (text.length < 2) { visible.value = false; return; }

  if (props.containerRef) {
    const anchor = selection.anchorNode;
    if (anchor && !props.containerRef.contains(anchor)) {
      visible.value = false;
      return;
    }
  }

  const range = selection.getRangeAt(0);
  const rect  = range.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  let x = rect.left + scrollX + rect.width / 2 - BUBBLE_WIDTH / 2;
  let y = rect.top  + scrollY - BUBBLE_HEIGHT - 14;

  x = Math.max(8, Math.min(x, window.innerWidth + scrollX - BUBBLE_WIDTH - 8));
  if (rect.top < BUBBLE_HEIGHT + 20) y = rect.bottom + scrollY + 14;

  selectedText.value = text;
  position.value = { x, y };
  visible.value  = true;
}

const handleMouseUp  = () => setTimeout(handleSelectionChange, 10);
const handleMouseDown = (e: MouseEvent) => { if (bubbleRef.value?.contains(e.target as Node)) return; };
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === "Escape") { visible.value = false; window.getSelection()?.removeAllRanges(); }
  else setTimeout(handleSelectionChange, 10);
};

onMounted(() => {
  document.addEventListener("mouseup",   handleMouseUp);
  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("keyup",     handleKeyUp);
  document.addEventListener("selectionchange", () => {
    const s = window.getSelection();
    if (!s || s.isCollapsed) visible.value = false;
  });
});

onUnmounted(() => {
  document.removeEventListener("mouseup",   handleMouseUp);
  document.removeEventListener("mousedown", handleMouseDown);
  document.removeEventListener("keyup",     handleKeyUp);
});
</script>

<style>
.selection-bubble {
  position: absolute;
  z-index: 9999;
  width: 296px;
  pointer-events: all;
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12));
}

.bubble-bar {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 4px;
  gap: 2px;
}

.bubble-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  justify-content: center;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: #374151;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.12s, color 0.12s;
}

.bubble-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.bubble-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #e5e7eb;
}

.bubble-arrow::after {
  content: "";
  position: absolute;
  top: -7px;
  left: -5px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #ffffff;
}

/* Animations */
.bubble-enter-active {
  animation: bubblePop 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.bubble-leave-active {
  animation: bubbleFade 0.1s ease forwards;
}

@keyframes bubblePop {
  from { opacity: 0; transform: translateY(6px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
@keyframes bubbleFade {
  to   { opacity: 0; transform: translateY(-3px) scale(0.97); }
}
</style>