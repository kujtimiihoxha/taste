---
id: vue/reactive-composable-args
title: Pass refs or getters to composables, not plain values
applies:
  [
    "**/*.vue",
    "**/composables/**/*.ts",
    "**/composables/**/*.js",
    "**/stores/**/*.ts",
    "**/stores/**/*.js",
  ]
severity: should-fix
stage: diff
status: draft
source: Vue docs, "Composables", accepting reactive state, https://vuejs.org/guide/reusability/composables.html#accepting-reactive-state
quote: "useFetch() takes a static URL string as input - so it performs the fetch only once and is then done. What if we want it to re-fetch whenever the URL changes? In order to achieve this, we need to pass reactive state into the composable function, and let the composable create watchers that perform actions using the passed state."
added: 2026-10-19
---

When a composable should follow a value that changes, pass the ref itself, a
`computed`, or a getter such as `() => props.id`. Passing `count.value` or
`props.id` hands it a plain value that never changes. Inside the composable,
read inputs with `toValue()` (Vue 3.3+) in a `watch`, `watchEffect` or
`computed`, so they are tracked.

**Why:** The composable runs once, during setup. Given a plain value, it does
its work for the first value only, and the component goes stale when the
prop or ref changes. Nothing warns about it.

**Flag:** `useThing(someRef.value)`, `useThing(props.id)`, or `useThing(id)`
with `id` destructured from `defineProps`, when the value can change while
the component lives; a composable that calls `toValue()` on an input once at
its top instead of inside a watcher or `computed`.

**Don't flag:** values that never change while the component lives (a
constant, a fixed URL); arguments the composable documents as one-time
options, such as a starting value.

**Bad:**

```vue
<script setup lang="ts">
import { useFetch } from "@/composables/use-fetch";

const props = defineProps<{ userId: string }>();
const { data: user } = useFetch(`/api/users/${props.userId}`);
</script>

<template>
  <h2>{{ user?.name }}</h2>
</template>
```

**Good:**

```vue
<script setup lang="ts">
import { useFetch } from "@/composables/use-fetch";

const props = defineProps<{ userId: string }>();
const { data: user } = useFetch(() => `/api/users/${props.userId}`);
</script>

<template>
  <h2>{{ user?.name }}</h2>
</template>
```
