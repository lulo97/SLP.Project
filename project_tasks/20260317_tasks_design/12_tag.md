14. Abstract a tag select component to fetch all existing tag of application and also can input tag directly (tag1, tag2, tag3...)

We need an abstract tag selector that combines existing tags from the backend with free-text input. The current `a-select mode="tags"` already supports creating new tags; we only need to provide a list of existing tags as options. The design should be reusable, handle loading/error states, and integrate smoothly with Vue forms.

---

## 1. Core Requirements

- Fetch all existing tag names from the backend (e.g., `GET /api/tags`).
- Display them as selectable options in a dropdown.
- Allow typing to filter the options.
- Allow creating new tags by typing and pressing Enter or comma (token separator).
- v-model binding: array of strings (selected tag names).
- Loading state while fetching.
- Error handling (retry, fallback message).
- Reusable across features (quiz form, question form, etc.).

---

## 2. Proposed Architecture

### 2.1 Backend API

We need a dedicated endpoint to list all tags:

- **GET /api/tags** → returns `{ id: number, name: string }[]` or simply `string[]` of tag names.  
  (The existing `Tag` table already exists, so this is a straightforward addition.)

### 2.2 Frontend Store

Create a **tag store** (Pinia) to manage tags globally, with caching to avoid repeated requests.

- **State**: `tags: string[]`, `loading: boolean`, `error: string | null`.
- **Action**: `fetchTags()` – calls the API and updates state.  
  Optionally, a `refreshTags()` to force a fresh fetch.

This store can be used by any component that needs tag suggestions.

### 2.3 New Component: `TagSelector.vue`

Place in `@/components/common/` so it can be imported anywhere.

#### Props
| Name        | Type       | Required | Description |
|-------------|------------|----------|-------------|
| `modelValue`| `string[]` | Yes      | v-model binding of selected tag names |
| `placeholder` | `string` | No       | Placeholder text (default: "Enter tags...") |
| `disabled`  | `boolean`  | No       | Disable the selector |
| `maxTags`   | `number`   | No       | Optional limit on number of tags |

#### Events
- `update:modelValue` – emitted when selected tags change.

#### Internal Logic
- On mount, call `tagStore.fetchTags()` (if not already loaded).
- Compute `tagOptions` from `tagStore.tags` – each option is `{ value: string, label: string }`.
- Bind `a-select` with:
  - `mode="tags"`
  - `:value="modelValue"`
  - `@change="emit('update:modelValue', $event)"`
  - `:options="tagOptions"`
  - `:loading="tagStore.loading"`
  - `:token-separators="[',']"`
  - `:placeholder="placeholder"`
  - `:disabled="disabled"`
- If `tagStore.error` exists, show a warning message (e.g., "Failed to load suggestions") and possibly a retry button.

#### Example Template
```html
<a-select
  v-model:value="selectedTags"
  mode="tags"
  :options="tagOptions"
  :loading="tagStore.loading"
  :token-separators="[',']"
  :placeholder="placeholder"
  :disabled="disabled"
  @change="handleChange"
/>
<div v-if="tagStore.error" class="text-xs text-red-500 mt-1">
  Could not load suggestions. <a @click="tagStore.fetchTags()">Retry</a>
</div>
```

#### Example Usage in QuizFormPage
```vue
<template>
  <a-form-item label="Tags">
    <TagSelector v-model="form.tagNames" />
  </a-form-item>
</template>

<script setup>
import TagSelector from '@/components/common/TagSelector.vue'
</script>
```

---

## 3. Integration with Existing Forms

- **QuizFormPage** – replace the current `a-select` with `TagSelector`.
- **QuestionForm** – replace the tag select with `TagSelector`.
- Both forms already use `tagNames` as an array of strings, so no additional changes are needed.

---

## 4. Benefits

- **Consistency** – same behavior everywhere tags are used.
- **Performance** – tags are fetched once and cached.
- **User Experience** – existing tags are suggested, new tags can be added naturally.
- **Maintainability** – logic isolated in one component and store.

---

## 5. Edge Cases & Considerations

- **Empty state** – If no tags exist in the system, the dropdown is empty; user can still type new tags.
- **Duplicate tags** – The backend will handle duplicates by reusing existing tag IDs when saving.
- **Tag renaming** – Since we store only tag names, if a tag is renamed later, past references remain as strings. This is acceptable because tags are just labels; we don’t enforce referential integrity via name.
- **Large number of tags** – The `a-select` with virtual scrolling (Ant Design) handles many options efficiently.
- **Accessibility** – Use proper `data-testid` attributes for testing.

---

## 6. Optional Enhancements

- **Refresh button** – Allow user to manually refresh tag list.
- **Sorting** – Sort tags alphabetically for better discoverability.
- **Tag creation validation** – Enforce tag format (e.g., no spaces, max length) if needed.

---

This design gives us a clean, reusable tag selector that satisfies the requirement of fetching existing tags while allowing direct input. It leverages existing Ant Design components and integrates smoothly with the current form structure.