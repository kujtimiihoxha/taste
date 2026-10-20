---
id: vue/computed-not-watch
title: Derive values with computed, not a watcher that copies them
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
source: Vue docs, "Watchers", https://vuejs.org/guide/essentials/watchers.html
quote: 'Computed properties allow us to declaratively compute derived values. However, there are cases where we need to perform "side effects" in reaction to state changes - for example, mutating the DOM, or changing another piece of state based on the result of an async operation.'
added: 2026-10-19
---

If a value can be computed from props or other state, use `computed`. Don't
keep it in a `ref` and update it from `watch` or `watchEffect`. Watchers are
for side effects: a request, the DOM, storage, a library outside Vue.

**Why:** The copy is a second source of truth. Without `immediate: true` it is
wrong until the first change, a watch on a getter misses changes inside the
object, and other code can write to the copy. A `computed` is always in step
and has nothing to set up.

**Flag:** a `ref` that is only set inside a `watch` or `watchEffect` from other
reactive values; `watch(source, (v) => (x.value = f(v)), { immediate: true })`;
a watcher whose only job is to set another ref.

**Don't flag:** state set from the result of an async operation, such as data
fetched when an id changes, which the Vue docs name as a watcher's job; a
field the user edits that starts from a derived default (a slug that follows
the title until the user types one); watchers that sync with something
outside Vue.

**Bad:**

```vue
<script setup lang="ts">
import { ref, watch } from "vue";

type Alert = { id: string; state: string };
const props = defineProps<{ alerts: Alert[] }>();
const firing = ref<Alert[]>([]);

watch(
  () => props.alerts,
  (alerts) => {
    firing.value = alerts.filter((a) => a.state === "firing");
  },
  { immediate: true },
);
</script>

<template>
  <p>{{ firing.length }} firing</p>
</template>
```

**Good:**

```vue
<script setup lang="ts">
import { computed } from "vue";

type Alert = { id: string; state: string };
const props = defineProps<{ alerts: Alert[] }>();
const firing = computed(() => props.alerts.filter((a) => a.state === "firing"));
</script>

<template>
  <p>{{ firing.length }} firing</p>
</template>
```
