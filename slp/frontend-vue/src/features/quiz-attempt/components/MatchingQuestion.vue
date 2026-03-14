<template>
  <div>
    <div class="relative" ref="containerRef">
      <svg
        class="absolute inset-0 pointer-events-none"
        style="z-index: 1; overflow: visible;"
        :width="svgSize.w"
        :height="svgSize.h"
      >
        <path
          v-for="(line, i) in lines"
          :key="`${line.leftId}-${line.rightId}`"
          :d="line.d"
          fill="none"
          :stroke="lineColors[i % lineColors.length]"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.65"
        />
        <circle
          v-for="(line, i) in lines"
          :key="`dot-l-${line.leftId}`"
          :cx="line.x1" :cy="line.y1" r="3.5"
          :fill="lineColors[i % lineColors.length]"
          opacity="0.7"
        />
        <circle
          v-for="(line, i) in lines"
          :key="`dot-r-${line.rightId}`"
          :cx="line.x2" :cy="line.y2" r="3.5"
          :fill="lineColors[i % lineColors.length]"
          opacity="0.7"
        />
      </svg>

      <div class="grid grid-cols-2 gap-6">
        <!-- Left column -->
        <div class="flex flex-col gap-2">
          <div
            v-for="item in pairs"
            :key="'left-' + item.id"
            :ref="el => setRef(leftRefs, item.id, el)"
            @click="selectLeft(item.id)"
            :class="[
              'px-3 py-2.5 rounded-xl border-2 cursor-pointer select-none transition-all text-sm relative z-10',
              selectedLeft === item.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100'
                : isMatched(item.id, 'left')
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40'
            ]"
          >
            <span class="flex items-center gap-2">
              <span
                v-if="isMatched(item.id, 'left')"
                class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] shrink-0"
              >✓</span>
              {{ item.left }}
            </span>
          </div>
        </div>

        <!-- Right column -->
        <div class="flex flex-col gap-2">
          <div
            v-for="item in shuffledRight"
            :key="'right-' + item.id"
            :ref="el => setRef(rightRefs, item.id, el)"
            @click="selectRight(item.id)"
            :class="[
              'px-3 py-2.5 rounded-xl border-2 cursor-pointer select-none transition-all text-sm relative z-10',
              isMatched(item.id, 'right')
                ? 'border-green-500 bg-green-50 text-green-700'
                : selectedLeft !== null
                  ? 'border-dashed border-indigo-300 bg-indigo-50/30 text-gray-700 hover:border-indigo-500 hover:bg-indigo-50'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ item.right }}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between mt-3">
      <span class="text-xs text-gray-400">
        {{ modelValue.length }} / {{ pairs.length }} matched
      </span>
      <a-button size="small" danger ghost @click="reset" :disabled="modelValue.length === 0">
        Reset
      </a-button>
    </div>

    <div
      v-if="modelValue.length === pairs.length && pairs.length > 0"
      class="mt-2 text-center text-sm text-green-600 font-medium"
    >
      ✓ All pairs matched!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

interface Pair {
  id: number;
  left: string;
  right: string;
}

interface Line {
  leftId: number;
  rightId: number;
  x1: number; y1: number;
  x2: number; y2: number;
  d: string;
}

const props = withDefaults(defineProps<{
  pairs: Pair[];
  modelValue: Array<{ leftId: number; rightId: number }>;
}>(), {
  modelValue: () => [],
});

const emit = defineEmits(['update:modelValue']);

const lineColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

const selectedLeft = ref<number | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const leftRefs = new Map<number, HTMLElement>();
const rightRefs = new Map<number, HTMLElement>();
const lines = ref<Line[]>([]);
const svgSize = ref({ w: 0, h: 0 });
const shuffledRight = ref<Pair[]>([]);

let ro: ResizeObserver | null = null;

onMounted(() => {
  shuffledRight.value = [...props.pairs].sort(() => Math.random() - 0.5);

  // ResizeObserver handles container size changes without triggering re-render loop
  ro = new ResizeObserver(() => computeLines());
  if (containerRef.value) ro.observe(containerRef.value);

  nextTick(computeLines);
});

onBeforeUnmount(() => {
  ro?.disconnect();
});

// Only recompute lines when modelValue actually changes
watch(
  () => props.modelValue,
  () => nextTick(computeLines),
  { deep: true },
);

function setRef(map: Map<number, HTMLElement>, id: number, el: any) {
  if (el) map.set(id, el as HTMLElement);
  else map.delete(id);
}

function isMatched(id: number, side: 'left' | 'right') {
  return props.modelValue.some(m => side === 'left' ? m.leftId === id : m.rightId === id);
}

function selectLeft(id: number) {
  if (selectedLeft.value === id) { selectedLeft.value = null; return; }
  const filtered = props.modelValue.filter(m => m.leftId !== id);
  if (filtered.length !== props.modelValue.length) emit('update:modelValue', filtered);
  selectedLeft.value = id;
}

function selectRight(id: number) {
  if (selectedLeft.value === null) return;
  if (isMatched(id, 'right')) return;
  emit('update:modelValue', [...props.modelValue, { leftId: selectedLeft.value, rightId: id }]);
  selectedLeft.value = null;
}

function reset() {
  emit('update:modelValue', []);
  selectedLeft.value = null;
}

function computeLines() {
  const container = containerRef.value;
  if (!container) return;

  const cr = container.getBoundingClientRect();

  // Only update svgSize if dimensions actually changed — avoids unnecessary reactivity
  if (svgSize.value.w !== cr.width || svgSize.value.h !== cr.height) {
    svgSize.value = { w: cr.width, h: cr.height };
  }

  const newLines = props.modelValue.map(m => {
    const lEl = leftRefs.get(m.leftId);
    const rEl = rightRefs.get(m.rightId);
    if (!lEl || !rEl) return null;

    const lr = lEl.getBoundingClientRect();
    const rr = rEl.getBoundingClientRect();
    const x1 = lr.right - cr.left;
    const y1 = lr.top + lr.height / 2 - cr.top;
    const x2 = rr.left - cr.left;
    const y2 = rr.top + rr.height / 2 - cr.top;
    const cx = (x1 + x2) / 2;

    return {
      leftId: m.leftId, rightId: m.rightId,
      x1, y1, x2, y2,
      d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`,
    };
  }).filter(Boolean) as Line[];

  lines.value = newLines;
}
</script>