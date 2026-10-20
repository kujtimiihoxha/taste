---
id: vue/simple-templates
title: Keep template expressions simple; put logic in the script
applies: ["**/*.vue"]
severity: nit
stage: diff
source: Vue Style Guide, "Simple expressions in templates", https://vuejs.org/style-guide/rules-strongly-recommended.html#simple-expressions-in-templates
quote: "Component templates should only include simple expressions, with more complex expressions refactored into computed properties or methods. Complex expressions in your templates make them less declarative."
added: 2026-10-19
---

A template expression should read at a glance: a value, a short condition,
one call, a simple toggle. Move handlers with several steps into a named
function in the script, and long derivations into a `computed`.

**Why:** Logic inline in markup has no name, is easy to miss when skimming,
and is hard to test. A `computed` also caches its result instead of running
again on every render.

**Flag:** inline handlers with several statements, `;` or branches; nested
ternaries; `.filter().map()` chains or string building inside `{{ }}` or a
binding; the same expression copied into several bindings.

**Don't flag:** a single call (`@click="save(rule)"`); one assignment
(`@click="open = !open"`); a short ternary for a class or a label. Don't ask
for a function per one-liner either (core/deep-not-shallow).

**Bad:**

```vue
<script setup lang="ts">
const props = defineProps<{ draft: string; saved: string }>();
const emit = defineEmits<{ save: [text: string]; cancel: [] }>();
</script>

<template>
  <button
    @click="props.draft.trim() === props.saved ? emit('cancel') : emit('save', props.draft.trim())"
  >
    Done
  </button>
</template>
```

**Good:**

```vue
<script setup lang="ts">
const props = defineProps<{ draft: string; saved: string }>();
const emit = defineEmits<{ save: [text: string]; cancel: [] }>();

function done() {
  const text = props.draft.trim();
  if (text === props.saved) emit("cancel");
  else emit("save", text);
}
</script>

<template>
  <button @click="done">Done</button>
</template>
```
