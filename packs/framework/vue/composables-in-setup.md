---
id: vue/composables-in-setup
title: Call composables in setup, not in handlers, computed or timers
applies: ["**/*.vue", "**/composables/**/*.ts", "**/composables/**/*.js"]
severity: must-fix
stage: diff
status: draft
source: Vue docs, "Composables", usage restrictions, https://vuejs.org/guide/reusability/composables.html#usage-restrictions
quote: "Composables should only be called in <script setup> or the setup() hook. They should also be called synchronously in these contexts. In some cases, you can also call them in lifecycle hooks like onMounted()."
added: 2026-10-19
---

Call composables that need an active component or automatic disposal
(`useRouter()`, `useI18n()`, many custom `useX()` functions) synchronously in
`<script setup>`, `setup()`, or another composable called there. Some support
calls in lifecycle hooks such as `onMounted`; follow that composable's contract. Don't call them inside event handlers, `computed` getters,
watcher callbacks or timers, or after an `await` inside `setup()` or a
composable. Unlike React hooks, they may be called inside an `if`.

**Why:** Vue ties lifecycle hooks, watchers and `inject()` to the component
being set up. Called later, there is no such component: hooks never run,
watchers are never stopped and leak, and `inject()` returns `undefined` with
a warning, so `useRouter()` in a click handler crashes. Inside a `computed`,
every recompute makes a new set of refs and watchers.

**Flag:** a composable that needs active component context or automatic
disposal, called inside a function that runs on a user event, in a
`computed`, in a `watch` callback or a `setTimeout`; `useX()` after `await`
inside `setup()` or inside a composable.

**Don't flag:** a call supported inside a lifecycle hook; an instance-independent
composable with an explicit lifetime and cleanup owner; a composable called
inside an `if` in setup; a call after a
top-level `await` in `<script setup>`, where the compiler restores the
component; Pinia's `useXStore()` in handlers, guards or actions once
`app.use(pinia)` has run, which Pinia supports in apps without SSR; `onX()`
or `watch()` called right after `await` in `setup()`, which
eslint-plugin-vue's essential config already reports.

**Bad:**

```vue
<script setup lang="ts">
import { useRouter } from "vue-router";

function goBack() {
  const router = useRouter();
  router.push("/alerts");
}
</script>

<template>
  <button @click="goBack">Back</button>
</template>
```

**Good:**

```vue
<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goBack() {
  router.push("/alerts");
}
</script>

<template>
  <button @click="goBack">Back</button>
</template>
```
