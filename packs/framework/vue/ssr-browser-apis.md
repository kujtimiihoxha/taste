---
id: vue/ssr-browser-apis
title: In SSR apps, use browser APIs only after mount
applies:
  [
    "**/*.vue",
    "**/composables/**/*.ts",
    "**/composables/**/*.js",
    "**/stores/**/*.ts",
    "**/stores/**/*.js",
  ]
severity: must-fix
stage: diff
status: draft
source: Vue docs, "Server-Side Rendering", access to platform-specific APIs, https://vuejs.org/guide/scaling-up/ssr.html#access-to-platform-specific-apis
quote: "Universal code cannot assume access to platform-specific APIs, so if your code directly uses browser-only globals like window or document, they will throw errors when executed in Node.js, and vice-versa."
added: 2026-10-19
---

When components also render on the server (Nuxt, VitePress, a Vite app built
on `createSSRApp`, or a library that must support SSR), setup code runs in
Node too. Browser-only globals such as `window` and `document` are unavailable
there. Node may provide similarly named APIs such as `navigator` or
`localStorage`; those are server APIs, not the current browser's state. Use them in `onMounted` or in event handlers. Not at the top of
`<script setup>`, a composable or a setup store, and not at module scope.

**Why:** On the server, `window` at setup time throws a `ReferenceError` and
the page fails to render. Reading browser state during setup can also make
the server HTML differ from the browser's first render, which Vue reports as
a hydration mismatch.

**Flag:** browser-only operations actually reached during server setup or
module loading; browser-state reads that make the first client render differ
from the server HTML; listeners on
`window` or `document` added during setup instead of in `onMounted`.

**Don't flag:** apps that never render on a server: none of the above in the
repo. If you can't tell, ask instead. Also code inside `onMounted` or an event
handler, and guarded client-only work that preserves hydration and lifecycle
behavior. `<ClientOnly>` can skip a component's setup and render, but does not
generally stop its static imports from executing at module scope. Libraries
that touch browser globals during import need a client-only dynamic import.

**Bad:**

```vue
<script setup lang="ts">
import { ref } from "vue";

const prefersDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);
</script>

<template>
  <span>{{ prefersDark ? "Dark" : "Light" }}</span>
</template>
```

**Good:**

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";

const prefersDark = ref(false);
onMounted(() => {
  prefersDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
});
</script>

<template>
  <span>{{ prefersDark ? "Dark" : "Light" }}</span>
</template>
```
