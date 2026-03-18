19. Implement setting (change theme dark/light and language)
## Design: Theme (Dark/Light) and Language Switching

### 1. Overview
The goal is to add user-configurable settings for switching between light/dark themes and changing the application language. These settings will be persisted locally and optionally synced with the backend for logged‑in users. The design leverages existing frontend technologies: Vue 3, Pinia, Ant Design Vue, Tailwind CSS, and Vue Router. The settings will be exposed via a dedicated UI element (e.g., a button in the header or a section in the right sidebar).

---

### 2. State Management (Pinia Store)
A new Pinia module `settingsStore` will manage the state of theme and language.

- **State**  
  - `theme`: `'light' | 'dark'` (default: `'light'`)  
  - `language`: a string representing the locale code (e.g., `'en'`, `'vi'`). Default from browser or fallback to `'en'`.

- **Actions**  
  - `setTheme(theme: 'light' | 'dark')` – updates the theme and applies it.  
  - `setLanguage(locale: string)` – updates the language and triggers i18n locale change.  
  - `loadSettings()` – reads persisted settings from `localStorage` (or backend) on app start.  
  - `saveSettings()` – persists current settings to `localStorage` (and optionally to backend via API).

- **Getters**  
  - `isDark`: computed boolean based on theme.  
  - `currentLocale`: returns the active language.

---

### 3. Persistence
- **LocalStorage** – Immediate persistence: keys `app_theme` and `app_language`. On app load, the store reads these values and initializes state.  
- **Backend Sync (optional)** – If the user is authenticated, the settings can be sent to a new `/api/user/preferences` endpoint. The backend would store them in the `users` table (add a `preferences` JSONB column). On login, preferences are fetched and merged with local ones. This allows the same settings across devices.

---

### 4. Theme Implementation
The application uses both Ant Design Vue and Tailwind CSS. The theme must affect both.

#### 4.1 Ant Design Theme
Ant Design’s `ConfigProvider` accepts a `theme` prop. The theme can be switched between light and dark algorithms.

- For **light mode**, use the default algorithm.  
- For **dark mode**, apply the `darkAlgorithm` from `ant-design-vue/es/theme`.  
- The `theme` object also allows customizing tokens (e.g., `colorPrimary`), which remain independent of the mode.

The `App.vue` component already wraps the app with `<a-config-provider>`. We will make the `theme` prop reactive based on `settingsStore.theme`.

#### 4.2 Tailwind Dark Mode
Tailwind’s dark mode can be toggled by adding a class (`dark`) to the root `<html>` element.  
- Configure Tailwind to use the **class strategy** (`darkMode: 'class'`).  
- When the theme changes, add/remove the `dark` class on `document.documentElement`.  
- Tailwind utility classes like `bg-white dark:bg-gray-800` will then respond automatically.

#### 4.3 CSS Variables for Custom Components
For any custom styling not covered by Tailwind or Ant Design, we can define CSS variables in `:root` and override them in a `dark` class.

---

### 5. Language Implementation
Internationalisation will be handled by `vue-i18n`.

#### 5.1 i18n Setup
- Install `vue-i18n` (already a dependency? Not listed; we need to add it).  
- Create locale message files (e.g., `locales/en.json`, `locales/vi.json`) containing all translatable strings.  
- In `main.ts`, create the i18n instance with the default locale (from store) and fallback locale.  
- Provide the i18n instance to the app.

#### 5.2 Switching Language
When `setLanguage` is called:
- Update the i18n global locale: `i18n.global.locale.value = newLocale`.  
- Also update Ant Design’s locale by passing the corresponding locale object (e.g., `enUS` from `ant-design-vue/es/locale`) to `ConfigProvider`’s `locale` prop.  
- Persist the choice.

#### 5.3 Translation Strategy
- All user‑facing strings must be wrapped in `$t()` or the `<i18n-t>` component.  
- For dynamic content (e.g., API error messages), the backend should return language‑agnostic codes or the frontend can map known messages.

---

### 6. UI Components and Placement
The settings controls should be easily accessible. Two options are considered:

#### Option A: Settings Button in Header
- Add a button (sun/moon icon for theme, language icon for language) to the `header-right` slot of `MobileLayout.vue`.  
- Clicking the button opens a small dropdown or a modal with toggle switches.  
- **Pros**: Always visible, minimal navigation.  
- **Cons**: May clutter the header on small screens.

#### Option B: Settings Section in Right Sidebar
- Add a “Settings” menu item in `RightSidebar.vue` that expands to show theme and language toggles.  
- **Pros**: Keeps header clean, consistent with existing navigation.  
- **Cons**: Requires an extra click to open sidebar then settings.

**Recommended**: Combine both – place a settings icon in the header that toggles a drawer (or directly toggles theme) and also add a settings menu item in the sidebar for more options. For simplicity in the first iteration, a single settings button in the header that opens a modal/dropdown with both toggles is sufficient.

#### UI Components Needed
- `ThemeToggle`: a switch or two buttons (light/dark).  
- `LanguageSelector`: a dropdown with available languages.  
- `SettingsModal` or `SettingsDrawer`: container for the controls, triggered from header.

These components will dispatch store actions and react to store state.

---

### 7. Integration with Existing Codebase

#### 7.1 Changes in `App.vue`
- Import the settings store and make the `theme` and `locale` reactive.  
- Bind the `theme` prop of `ConfigProvider` to a computed object that changes algorithm based on `settingsStore.theme`.  
- Also bind the `locale` prop to the appropriate Ant Design locale object based on `settingsStore.language`.

#### 7.2 Changes in `main.ts`
- Initialize and install `vue-i18n`.  
- Load the store and set initial locale before mounting.

#### 7.3 Changes in `MobileLayout.vue`
- Add a new slot item in `header-right` for the settings button (if using header placement).  
- Import and render the settings trigger component.

#### 7.4 Changes in `RightSidebar.vue`
- Add a new menu item “Settings” that, when clicked, opens the settings modal/drawer or expands inline.  
- Alternatively, include the toggles directly inside the sidebar.

#### 7.5 Tailwind Configuration
- Update `tailwind.config.js` to enable dark mode with class strategy.

---

### 8. Backend Considerations (Future)
To support per‑user settings across devices:
- Add a `preferences` column (JSONB) to the `users` table.  
- Create endpoints:  
  - `GET /api/user/preferences` – returns saved preferences.  
  - `PUT /api/user/preferences` – updates preferences.  
- On login, fetch preferences and merge with local storage (local overrides remote if newer). On logout, optionally clear.

---

### 9. Accessibility & UX
- Theme toggle should respect system preference initially (optional) but allow manual override.  
- Language selector should display language names in their native script (e.g., “Tiếng Việt” for Vietnamese).  
- Ensure contrast ratios meet WCAG standards in both themes.  
- Use ARIA labels for buttons.

---

### 10. Implementation Steps (High‑Level)
1. Add `vue-i18n` to the project.  
2. Create locale JSON files with initial translations for all existing UI strings (requires auditing the app).  
3. Implement the settings store with localStorage persistence.  
4. Modify `App.vue` to reactively set Ant Design theme and locale.  
5. Configure Tailwind dark mode class.  
6. Create the settings UI components and place them in the layout.  
7. Update all existing templates to use `$t` for static text.  
8. Test theme and language switching thoroughly.

---

### 11. Diagram (Textual)

```
[App startup]
    |
    v
[settingsStore.loadSettings()] --> reads localStorage
    |
    v
[App.vue] provides theme & locale to <a-config-provider>
    |
    v
[User clicks settings button] --> opens SettingsDrawer
    |
    v
[SettingsDrawer] contains:
    - ThemeToggle (light/dark)
    - LanguageSelector (dropdown)
    |
    v
[User toggles] --> store actions update state
    |
    v
[Store] persists to localStorage, emits changes
    |
    v
[App.vue] re-renders with new theme/locale
    |
    v
[document.documentElement] class toggled for Tailwind dark mode
    |
    v
[i18n] locale changed, Ant Design locale updated
```

---

This design provides a robust foundation for theme and language switching, leveraging the existing stack and ensuring a seamless user experience.