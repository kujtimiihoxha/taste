---
id: vue/template-refs
title: Use template refs and bindings, not DOM queries
applies: ["**/*.vue", "**/composables/**/*.ts", "**/composables/**/*.js"]
severity: should-fix
stage: diff
status: draft
source: Vue docs, "Template Refs", https://vuejs.org/guide/essentials/template-refs.html
quote: "While Vue's declarative rendering model abstracts away most of the direct DOM operations for you, there may still be cases where we need direct access to the underlying DOM elements. To achieve this, we can use the special ref attribute"
added: 2026-10-19
---

To change what's on screen, change reactive state and bind it in the
template (`:type`, `:class`, `v-if`). When you need the element itself (to
focus, measure or hand it to a library), get it from a template ref:
`useTemplateRef()` in Vue 3.5+, or a `ref` named like the `ref` attribute
before that. Don't find the component's own elements with
`document.querySelector`, ids or class names, and don't set their
attributes, classes or styles by hand.

**Why:** Vue renders from state, so a hand-made DOM change is invisible to it
and can be undone by the next update. A document-wide query depends on class
names and can match an element in another copy of the same component.

**Flag:** `document.querySelector`, `querySelectorAll` or `getElementById` for
elements the component renders; `classList`, `style` or `setAttribute`
changes a binding could express; writes like `this.$refs.input.type = 'text'`.

**Don't flag:** elements outside the component's template, such as a theme
class on `document.body`; a library that needs a DOM node, given one from a
template ref; reading or measuring an element taken from a template ref.

**Bad:**

```vue
<script setup lang="ts">
import { nextTick, ref } from "vue";

const editing = ref(false);

async function startEditing() {
  editing.value = true;
  await nextTick();
  document.querySelector<HTMLInputElement>(".rule-name")?.focus();
}
</script>

<template>
  <input v-if="editing" class="rule-name" />
  <button v-else @click="startEditing">Rename</button>
</template>
```

**Good:**

```vue
<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue";

const editing = ref(false);
const nameInput = useTemplateRef<HTMLInputElement>("name");

async function startEditing() {
  editing.value = true;
  await nextTick();
  nameInput.value?.focus();
}
</script>

<template>
  <input v-if="editing" ref="name" />
  <button v-else @click="startEditing">Rename</button>
</template>
```
