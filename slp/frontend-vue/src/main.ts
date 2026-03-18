import { createApp }   from 'vue';
import { createPinia }  from 'pinia';
import Antd             from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App              from './App.vue';
import router           from './router';
import { i18n }         from './i18n';
import { useSettingsStore } from './features/settings/stores/settingsStore';

const app   = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Antd);
app.use(i18n);

// Sync vue-i18n locale whenever settingsStore.language changes
const settingsStore = useSettingsStore();
i18n.global.locale.value = settingsStore.language;

import { watch } from 'vue';
watch(
  () => settingsStore.language,
  (lang) => { i18n.global.locale.value = lang; },
);

app.mount('#app');