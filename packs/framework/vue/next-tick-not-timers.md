---
id: vue/next-tick-not-timers
title: Wait for the DOM update with nextTick, not a timer
applies: ["**/*.vue", "**/composables/**/*.ts", "**/composables/**/*.js"]
severity: should-fix
stage: diff
status: draft
source: Vue docs, "Reactivity Fundamentals", DOM update timing, https://vuejs.org/guide/essentials/reactivity-fundamentals.html#dom-update-timing
quote: 'However, it should be noted that the DOM updates are not applied synchronously. Instead, Vue buffers them until the "next tick" in the update cycle to ensure that each component updates only once no matter how many state changes you have made. To wait for the DOM update to complete after a state change, you can use the nextTick() global API'
added: 2026-10-19
---

Vue applies DOM changes on the next tick after state changes. To run code
after that update, `await nextTick()`. For the first render use `onMounted`,
and for a watcher that needs the new DOM use `flush: 'post'`. Don't use
`setTimeout` with a guessed delay to let Vue render.

**Why:** Vue's update is done before any timer fires, so the delay only adds a
wait: the user can see the screen jump before the code runs, and the next
reader can't tell what the timer waits for. `nextTick` names it.

**Flag:** `setTimeout(fn, 0)` or `setTimeout(fn, 50)` used to wait for Vue to
render; delays with comments like "wait for the DOM" or "let it render".

**Don't flag:** real timing features (debounced input, a toast that hides
after a few seconds, polling); `nextTick` right after a state change to read
or focus the new DOM; a timer that waits for something other than Vue, like a
font load, an image, a CSS transition or a handler throttled with
`requestAnimationFrame`. `nextTick` can't wait for those, so ask what the
timer is for before suggesting it.

**Bad:**

```vue
<script setup lang="ts">
// Vue 3.5+.
import { ref, useTemplateRef } from "vue";

const open = ref(false);
const panel = useTemplateRef<HTMLElement>("panel");

function showDetails() {
  open.value = true;
  setTimeout(() => panel.value?.scrollIntoView(), 50);
}
</script>

<template>
  <button @click="showDetails">Details</button>
  <section v-if="open" ref="panel">Details</section>
</template>
```

**Good:**

```vue
<script setup lang="ts">
// Vue 3.5+.
import { nextTick, ref, useTemplateRef } from "vue";

const open = ref(false);
const panel = useTemplateRef<HTMLElement>("panel");

async function showDetails() {
  open.value = true;
  await nextTick();
  panel.value?.scrollIntoView();
}
</script>

<template>
  <button @click="showDetails">Details</button>
  <section v-if="open" ref="panel">Details</section>
</template>
```
