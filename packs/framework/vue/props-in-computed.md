---
id: vue/props-in-computed
title: Derive from props inside computed, not once in setup
applies: ["**/*.vue"]
severity: should-fix
stage: diff
source: Vue docs, "Props", one-way data flow, https://vuejs.org/guide/components/props.html#one-way-data-flow
quote: "The prop is passed in as a raw value that needs to be transformed. In this case, it's best to define a computed property using the prop's value"
added: 2026-10-19
---

`<script setup>` runs once per component. A plain `const` built from a prop,
or a `ref` started from one, keeps the first value and ignores later changes.
Put values derived from props in `computed`, or use the prop in the template
directly. This holds with Vue 3.5 props destructure too: the compiler turns
`mode` into `props.mode`, but a top-level `const x = f(mode)` still runs once.

**Why:** The bug shows only when the parent changes the prop, often after the
first test. Then the component shows stale data, and people add watchers to
patch it (see vue/computed-not-watch).

**Flag:** `const x = f(props.y)`, or `f(y)` with `y` destructured from
`defineProps`, at the top level of setup and used in the template;
`ref(props.y)` for a value the user never edits.

**Don't flag:** a prop that is only a starting value and is named that way
(`initialCount`) for state the user edits, as the Vue docs show; reads through `props`, or through Vue 3.5+ reactive `defineProps`
destructures, inside a function that runs later (an event handler, `onMounted`),
which see the current value; a component its parent remounts with a `key` when the prop
changes.

**Bad:**

```vue
<script setup lang="ts">
const props = defineProps<{ mode: "none" | "one" | "many" }>();
const showSelect = props.mode !== "none";
</script>

<template>
  <input v-if="showSelect" type="checkbox" />
</template>
```

**Good:**

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ mode: "none" | "one" | "many" }>();
const showSelect = computed(() => props.mode !== "none");
</script>

<template>
  <input v-if="showSelect" type="checkbox" />
</template>
```
