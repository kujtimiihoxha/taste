---
id: vue/define-model
title: Use defineModel for v-model on your own components
applies: ["**/*.vue"]
severity: should-fix
stage: diff
status: draft
source: Vue docs, "Component v-model", https://vuejs.org/guide/components/v-model.html
quote: "v-model can be used on a component to implement a two-way binding. Starting in Vue 3.4, the recommended approach to achieve this is using the defineModel() macro"
added: 2026-10-19
---

This is the Vue macro case of `core/use-libraries-as-designed`.
When a parent should bind a value two-way (`v-model`, `v-model:open`),
declare it in the child with `defineModel()` and read or write the ref it
returns. Don't build it from a prop, a local copy and watchers that copy both
ways, and don't invent event names (`change`, `updateValue`) that the parent
has to wire back by hand. Needs Vue 3.4+.

**Why:** `defineModel` declares the prop and its `update:` event in one line
and keeps both sides in step. A hand-made copy is extra state with two
watchers to keep right, and a custom event name means the parent can't use
`v-model`.

**Flag:** `const local = ref(props.modelValue)` with watchers or emits that
copy it back and forth; a value prop paired with a custom event that the
parent copies into its own state.

**Don't flag:** projects on Vue before 3.4; components without
`<script setup>`, where the `defineModel` macro doesn't exist; a draft the
child edits and sends up only on save (an edit form with Cancel); a one-way
prop the child never changes; an existing writable `computed` around
`modelValue`, the pre-3.4 pattern, in code the change doesn't touch.

**Bad:**

```vue
<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const text = ref(props.modelValue);
watch(
  () => props.modelValue,
  (value) => (text.value = value),
);
watch(text, (value) => emit("update:modelValue", value));
</script>

<template>
  <input v-model="text" />
</template>
```

**Good:**

```vue
<script setup lang="ts">
const text = defineModel<string>({ required: true });
</script>

<template>
  <input v-model="text" />
</template>
```
