6. Implement breadcrum, example: Home -> Quiz...

# Breadcrumb Implementation Design

## Overview
Add breadcrumb navigation to key pages (dashboard, quiz, questions, sources, etc.) to improve orientation and allow quick navigation up the hierarchy. Breadcrumbs will be placed in the header area, replacing the static page title on pages that use them.

---

## 1. Breadcrumb Component (`src/components/Breadcrumb.vue`)

### Purpose
A reusable component that renders a trail of navigation links using Ant Design's `a-breadcrumb`. Supports truncation on small screens.

### Props
- `items`: `Array<{ label: string; path?: string }>` – list of breadcrumb items. The last item (current page) should have no `path` (or `path: undefined`) to render as plain text.
- `maxItems`: `number` (default: `3`) – maximum number of items to show before truncating with an ellipsis.

### Behavior
- If `items.length` <= `maxItems`, show all items.
- If `items.length` > `maxItems`, show:
  - First item
  - Ellipsis (as a non‑link item with `label: '...'`)
  - Last `maxItems - 1` items (so that the current page is always visible)
- On mobile (screen width < 640px), `maxItems` can be reduced to `2` via CSS media query or a separate prop. We'll handle it responsively by setting a smaller default in a computed property based on window width (optional, can be omitted for simplicity initially).

### Template
```vue
<template>
  <a-breadcrumb>
    <template v-for="(item, index) in visibleItems" :key="index">
      <a-breadcrumb-item v-if="item.path">
        <router-link :to="item.path">{{ item.label }}</router-link>
      </a-breadcrumb-item>
      <a-breadcrumb-item v-else>
        {{ item.label }}
      </a-breadcrumb-item>
    </template>
  </a-breadcrumb>
</template>
```

### Truncation Logic (Computed)
```ts
const visibleItems = computed(() => {
  if (items.length <= maxItems) return items
  const first = items[0]
  const last = items.slice(-(maxItems - 1))
  return [first, { label: '...' }, ...last]
})
```

---

## 2. Integration with MobileLayout

The existing `MobileLayout` component already provides a `#header-left` slot. Pages that want breadcrumbs will render the `Breadcrumb` component inside that slot.

### Example Page Template (QuizDetailPage.vue)
```vue
<template>
  <MobileLayout>
    <template #header-left>
      <Breadcrumb :items="breadcrumbItems" />
    </template>
    <!-- rest of page content -->
  </MobileLayout>
</template>
```

No changes to `MobileLayout` are required; it already accepts the slot.

---

## 3. Defining Breadcrumb Items per Page

Each page is responsible for providing its own `breadcrumbItems` array, typically as a `computed` ref that may depend on route params and fetched data.

### Common Patterns

#### Dashboard (`/dashboard`)
```ts
const breadcrumbItems = [{ label: 'Home' }]
```

#### Quiz List (`/quiz`)
```ts
const breadcrumbItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Quizzes' }
]
```

#### Quiz Detail (`/quiz/:id`)
```ts
const id = route.params.id as string
const { quiz, loading } = useQuiz(id) // hypothetical composable

const breadcrumbItems = computed(() => [
  { label: 'Home', path: '/dashboard' },
  { label: 'Quizzes', path: '/quiz' },
  { label: loading.value ? 'Loading...' : (quiz.value?.title || 'Quiz') }
])
```

#### Quiz Edit (`/quiz/:id/edit`)
```ts
const breadcrumbItems = computed(() => [
  { label: 'Home', path: '/dashboard' },
  { label: 'Quizzes', path: '/quiz' },
  { label: quiz.value?.title || 'Quiz', path: `/quiz/${id}` },
  { label: 'Edit' }
])
```

#### Question List (`/questions`)
```ts
const breadcrumbItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Questions' }
]
```

#### Source List (`/source`)
```ts
const breadcrumbItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Sources' }
]
```

#### Source Detail (`/source/:id`)
Similar to quiz detail: include source title after fetching.

#### Search (`/search`)
```ts
const breadcrumbItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Search' }
]
```

#### Admin (`/admin`)
```ts
const breadcrumbItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Admin' }
]
```

---

## 4. Handling Dynamic Labels

For pages that require async data (quiz detail, source detail), the breadcrumb will initially show a loading placeholder (e.g., "Loading...") until the data arrives. Once loaded, it updates automatically because `breadcrumbItems` is computed based on reactive data.

**Important:** Ensure that the route path for the parent item (e.g., `Quizzes`) uses the correct route name; we can use `router.resolve({ name: 'quiz-list' }).path` or simply hardcode `/quiz` if the route path is stable.

---

## 5. Responsive Behavior

- On smaller screens (e.g., width < 640px), the breadcrumb may become crowded. We can either:
  - Set a lower `maxItems` (e.g., `2`) via a prop passed from the page based on a media query.
  - Use CSS to hide certain items with `display: none` on breadcrumb items, but that requires more control. Ant Design's breadcrumb does not natively support responsive truncation.

**Simpler approach:** Accept a `responsive` prop that, when `true`, reduces `maxItems` to `2` on screens below a breakpoint. This can be implemented with a `resize` event listener or a `matchMedia` query inside the component.

For the first version, we can skip responsive truncation and rely on Ant Design's breadcrumb wrapping behavior (it will wrap to multiple lines if needed). This is acceptable for a start.

---

## 6. Testing

- Verify that breadcrumbs appear on all intended pages.
- Check that links navigate correctly.
- Ensure that the current page item is not a link.
- Test with long titles and many items to confirm truncation works.

---

## 7. Future Enhancements

- **Global breadcrumb store** – Instead of each page defining its own items, a central store could listen to route changes and build items automatically from route meta, with support for dynamic labels via callbacks.
- **Dropdown for truncated items** – Use Ant Design's `a-dropdown` to show hidden items in a menu when ellipsis is clicked.
- **Icons** – Add home icon for the first item.

---

## 8. Summary of Changes

1. **New Component:** `src/components/Breadcrumb.vue` – renders breadcrumb trail with optional truncation.
2. **Page Updates:** Modify each relevant page to include `#header-left` slot with `<Breadcrumb :items="breadcrumbItems" />`.
3. **Computed Properties:** Add `breadcrumbItems` to each page, using reactive data where needed.
4. **No changes to layout or routing infrastructure required.**

This design keeps the implementation simple, localized, and maintainable.