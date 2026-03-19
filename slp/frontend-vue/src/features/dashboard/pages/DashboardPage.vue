<template>
  <MobileLayout title="Dashboard">
    <div
      ref="scrollContainer"
      class="space-y-8 pb-12 px-4 bg-gray-50 min-h-screen"
      data-testid="dashboard-container"
      @scroll.passive="onScroll"
    >
      <div v-if="refreshing" class="text-center py-2 text-blue-500">
        <ReloadIcon :size="20" class="inline animate-spin" />
        <span class="ml-2 text-sm">Refreshing...</span>
      </div>

      <section data-testid="intro-section" class="pt-4">
        <div class="mb-5">
          <h1 class="text-2xl font-bold text-gray-900">Welcome to SLP</h1>
          <p class="text-sm text-gray-600 mt-2 leading-relaxed">
            SLP is your intelligent learning companion. We help you master new
            languages and technical topics through AI-powered analysis, smart
            quizzes, and interactive study tools.
          </p>
        </div>

        <div class="space-y-3" data-testid="intro-chips">
          <div
            v-for="chip in introChips"
            :key="chip.id"
            class="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:bg-gray-50 transition-colors"
            @click="navigateTo(chip.route)"
          >
            <div
              :class="`p-2.5 rounded-xl bg-${chip.color}-50 text-${chip.color}-600 shadow-sm text-center`"
            >
              <component :is="chip.icon" :size="20" />
            </div>
            <div class="flex-1">
              <h4 class="font-bold text-gray-800 text-sm">
                {{ chip.label }}
              </h4>
              <p class="text-xs text-gray-500 mt-0.5 leading-snug">
                {{ chip.summary }}
              </p>
            </div>
            <ChevronRight :size="16" class="text-gray-300 self-center" />
          </div>
        </div>
      </section>

      <section data-testid="wotd-section">
        <h2 class="text-lg font-semibold mb-3 px-1">Word of the Day</h2>
        <a-card
          class="shadow-md rounded-3xl border-none overflow-hidden"
          data-testid="wotd-card"
        >
          <div v-if="dashboardStore.loading.word" class="py-6">
            <a-skeleton active :paragraph="{ rows: 3 }" />
          </div>

          <div
            v-else-if="dashboardStore.wordOfTheDay"
            class="flex flex-col items-center text-center space-y-4"
          >
            <div class="pt-2">
              <div
                class="text-3xl font-black text-blue-600"
                data-testid="wotd-word"
              >
                {{ dashboardStore.wordOfTheDay.word }}
              </div>
              <div
                class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1"
                data-testid="wotd-part-of-speech"
              >
                {{ dashboardStore.wordOfTheDay.partOfSpeech }}
              </div>
            </div>

            <div class="space-y-2">
              <p
                class="text-lg font-semibold text-gray-800"
                data-testid="wotd-vietnamese"
              >
                {{ dashboardStore.wordOfTheDay.vietnameseTranslation }}
              </p>
              <p
                class="text-sm italic text-gray-500 px-4"
                data-testid="wotd-example"
              >
                “{{ dashboardStore.wordOfTheDay.example }}”
              </p>
            </div>

            <button
              class="flex items-center justify-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full"
              @click="toggleExpand"
            >
              {{ expanded ? "Show Less" : "More Details" }}
              <ChevronDown
                :size="14"
                :class="{ 'rotate-180': expanded }"
                class="transition-transform"
              />
            </button>

            <transition name="slide">
              <div
                v-if="expanded"
                class="w-full bg-gray-50 rounded-2xl p-4 text-left space-y-3"
              >
                <p
                  v-if="dashboardStore.wordOfTheDay.origin"
                  class="text-xs"
                  data-testid="wotd-origin"
                >
                  <span class="font-bold text-gray-700 block mb-0.5"
                    >Origin:</span
                  >
                  {{ dashboardStore.wordOfTheDay.origin }}
                </p>
                <p
                  v-if="dashboardStore.wordOfTheDay.funFact"
                  class="text-xs"
                  data-testid="wotd-funfact"
                >
                  <span class="font-bold text-gray-700 block mb-0.5"
                    >Fun Fact:</span
                  >
                  {{ dashboardStore.wordOfTheDay.funFact }}
                </p>
              </div>
            </transition>

            <div class="flex items-center justify-center gap-3 w-full pt-2">
              <a-button
                shape="round"
                class="flex-1 flex items-center justify-center h-10 border-blue-200 text-blue-600"
                @click="handleListen"
                :loading="ttsLoading"
              >
                <template #icon
                  ><Headphones :size="16" class="mr-1"
                /></template>
                Listen
              </a-button>

              <a-button
                shape="round"
                type="primary"
                class="flex-1 flex items-center justify-center h-10 shadow-lg shadow-blue-100"
                @click="handleSaveToFavorites"
                :loading="savingFavorite"
              >
                <template #icon><Star :size="16" class="mr-1" /></template>
                Save
              </a-button>
            </div>
          </div>
        </a-card>
      </section>

      <section data-testid="features-section">
        <h2 class="text-lg font-semibold mb-3 px-1">Explore More</h2>
        <div class="space-y-4" data-testid="highlight-features">
          <a-card
            v-for="feature in features"
            :key="feature.id"
            hoverable
            class="w-full border-none shadow-sm rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
            @click="navigateTo(feature.route)"
          >
            <div class="flex items-center gap-4">
              <div class="p-3 bg-blue-50 rounded-xl">
                <component
                  :is="feature.icon"
                  :size="24"
                  class="text-blue-500"
                />
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-gray-900 leading-tight">
                  {{ feature.title }}
                </h3>
                <p class="text-xs text-gray-500 mt-1">
                  {{ feature.description }}
                </p>
              </div>
              <ArrowRight :size="18" class="text-gray-300" />
            </div>
          </a-card>
        </div>
      </section>

      <section data-testid="user-stats-section">
        <h2 class="text-lg font-semibold mb-3 px-1">Your Activity</h2>
        <div class="grid grid-cols-2 gap-4">
          <a-card
            v-for="stat in statCards"
            :key="stat.id"
            hoverable
            class="border-none shadow-sm rounded-2xl"
            @click="navigateTo(stat.route)"
          >
            <div class="flex flex-col items-center py-1">
              <component
                :is="stat.icon"
                :size="24"
                :class="stat.iconColor"
                class="mb-2"
              />
              <span class="text-xl font-black">{{ stat.value }}</span>
              <span
                class="text-[10px] uppercase font-bold text-gray-400 mt-1"
                >{{ stat.label }}</span
              >
            </div>
          </a-card>
        </div>
      </section>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  FileText,
  HelpCircle,
  FolderOpen,
  Star,
  Eye,
  MessageCircle,
  ChevronDown,
  Headphones,
  ArrowRight,
  BookOpen,
  Sparkles,
  Link as LinkIcon,
  RefreshCw as ReloadIcon,
  ChevronRight,
} from "lucide-vue-next";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useDashboardStore } from "../stores/dashboardStore";
import { useTts } from "@/features/tts/useTts";
import apiClient from "@/lib/api/client";

const router = useRouter();
const dashboardStore = useDashboardStore();
const { state, play } = useTts();
const ttsLoading = computed(() => state.value === "loading");

const expanded = ref(false);
const savingFavorite = ref(false);
const refreshing = ref(false);

const introChips = [
  {
    id: "quiz",
    label: "Adaptive Quizzes",
    summary:
      "Test your knowledge with AI-generated questions tailored to your level.",
    icon: FileText,
    color: "blue",
    route: "/quiz",
  },
  {
    id: "question",
    label: "Smart Bank",
    summary:
      "Access thousands of community-driven questions for deep subject mastery.",
    icon: HelpCircle,
    color: "green",
    route: "/questions",
  },
  {
    id: "source",
    label: "AI Analyzer",
    summary:
      "Upload documents or links to extract summaries and flashcards instantly.",
    icon: FolderOpen,
    color: "purple",
    route: "/source",
  },
  {
    id: "favorite",
    label: "My Library",
    summary:
      "Keep track of your saved vocabulary, notes, and favorite study materials.",
    icon: Star,
    color: "orange",
    route: "/profile?tab=favorites",
  },
];

const features = [
  {
    id: "quiz",
    title: "Interactive Learning",
    icon: BookOpen,
    description: "Engage with dynamic content designed to improve retention.",
    route: "/quiz",
  },
  {
    id: "question",
    title: "Knowledge Base",
    icon: HelpCircle,
    description:
      "Explore a structured database of academic and professional topics.",
    route: "/questions",
  },
  {
    id: "source",
    title: "Resource Hub",
    icon: LinkIcon,
    description: "Manage and analyze external articles and PDF study guides.",
    route: "/source",
  },
];

const statCards = computed(() => [
  {
    id: "quiz",
    label: "Quizzes",
    icon: FileText,
    value: dashboardStore.userStats?.quizCount ?? 0,
    iconColor: "text-blue-500",
    route: "/quiz?mine=true",
  },
  {
    id: "question",
    label: "Questions",
    icon: HelpCircle,
    value: dashboardStore.userStats?.questionCount ?? 0,
    iconColor: "text-green-500",
    route: "/questions",
  },
  {
    id: "source",
    label: "Sources",
    icon: FolderOpen,
    value: dashboardStore.userStats?.sourceCount ?? 0,
    iconColor: "text-purple-500",
    route: "/source",
  },
  {
    id: "favorite",
    label: "Favorites",
    icon: Star,
    value: dashboardStore.userStats?.favoriteCount ?? 0,
    iconColor: "text-orange-500",
    route: "/profile?tab=favorites",
  },
]);

const navigateTo = (path: string) => router.push(path);
const toggleExpand = () => {
  expanded.value = !expanded.value;
};

const handleListen = async () => {
  if (!dashboardStore.wordOfTheDay) return;
  play(dashboardStore.wordOfTheDay.word);
};

const handleSaveToFavorites = async () => {
  if (!dashboardStore.wordOfTheDay) return;
  savingFavorite.value = true;
  try {
    await apiClient.post("/favorites", {
      text: dashboardStore.wordOfTheDay.word,
      type: "word",
      note: "",
    });
    message.success("Saved to library!");
    dashboardStore.fetchUserStats();
  } catch (err: any) {
    message.error("Failed to save");
  } finally {
    savingFavorite.value = false;
  }
};

const onScroll = (e: Event) => {
  const el = e.target as HTMLElement;
  if (el.scrollTop <= -50 && !refreshing.value) {
    refreshing.value = true;
    dashboardStore.refreshAll().finally(() => {
      setTimeout(() => {
        refreshing.value = false;
      }, 500);
    });
  }
};

onMounted(() => dashboardStore.refreshAll());
watch(
  () => dashboardStore.wordOfTheDay,
  () => {
    expanded.value = false;
  },
);
</script>

<style scoped>
/* Standard slide animation for mobile expansion */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
  max-height: 300px;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Remove default Ant Card padding for custom inner layout control */
:deep(.ant-card-body) {
  padding: 16px;
}
</style>
