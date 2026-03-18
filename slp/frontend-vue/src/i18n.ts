import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import vi from './locales/vi.json';

// Read saved language from localStorage so i18n starts with the user's
// persisted preference (settingsStore syncs it afterward via watch).
function getInitialLocale(): 'en' | 'vi' {
  try {
    const raw = localStorage.getItem('app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.language === 'vi') return 'vi';
    }
  } catch { /* ignore */ }
  return 'en';
}

export const i18n = createI18n({
  legacy: false,          // use Composition API mode
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, vi },
});

/*
settingsStore — reads/writes localStorage key app_settings. toggleTheme() flips the dark class on <html>. Fully independent of i18n.
i18n.ts — reads the same localStorage key directly so it can set the correct initial locale before Vue mounts (avoids a flash of wrong language).
main.ts — installs i18n into the app, then adds a watch so any call to settingsStore.setLanguage('vi') automatically updates i18n.global.locale in real time.
Using in components: const { t } = useI18n() then {{ t('nav.dashboard') }}. The locale files mirror each other exactly, so adding a new key to en.json just needs the matching entry in vi.json.
*/