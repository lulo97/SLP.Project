import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type Theme    = 'light' | 'dark';
export type Language = 'en' | 'vi';

const STORAGE_KEY = 'app_settings';

interface PersistedSettings {
  theme:    Theme;
  language: Language;
}

function loadFromStorage(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedSettings;
  } catch { /* ignore parse errors */ }
  return { theme: 'light', language: 'en' };
}

function saveToStorage(settings: PersistedSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyThemeToDom(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadFromStorage();

  const theme    = ref<Theme>(initial.theme);
  const language = ref<Language>(initial.language);

  // Apply theme immediately on store init
  applyThemeToDom(theme.value);

  // Persist + apply DOM class whenever either value changes
  watch([theme, language], ([newTheme, newLang]) => {
    applyThemeToDom(newTheme);
    saveToStorage({ theme: newTheme, language: newLang });
  });

  function setTheme(value: Theme) {
    theme.value = value;
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  function setLanguage(value: Language) {
    language.value = value;
  }

  return { theme, language, setTheme, toggleTheme, setLanguage };
});