---
id: vue/stable-keys
title: Key list items by a stable id, not the index
applies: ["**/*.vue"]
severity: should-fix
stage: diff
status: draft
source: Vue docs, "List Rendering", maintaining state with key, https://vuejs.org/guide/essentials/list.html#maintaining-state-with-key
quote: "If the order of the data items has changed, instead of moving the DOM elements to match the order of the items, Vue will patch each element in-place and make sure it reflects what should be rendered at that particular index. This default mode is efficient, but only suitable when your list render output does not rely on child component state or temporary DOM state (e.g. form input values)."
added: 2026-10-19
---

In a `v-for` whose items can be reordered, filtered, added or removed, use a
stable id from the data as `:key`. Don't use the index or a random value.
eslint-plugin-vue requires a key, but it accepts the index.

**Why:** Vue matches rows by key. With index keys, removing the second row
gives its component state, input value or focus to the row that moves up.
Random keys remount every row on every render.

**Flag:** `:key="index"` or `:key="i"` on lists that reorder, remove, or insert
before existing rows when those rows hold state: a child component's own state, or DOM state such as an
input's value or focus; `Math.random()` or `crypto.randomUUID()` as a key in
the template.

**Don't flag:** static lists that never change; append-only lists whose
existing items keep their positions; rows that hold no state, such
as plain text or a component that only shows its props, where the docs say
patching in place is fine; items with no id and no state in a list that is
only ever replaced whole.

**Bad:**

```vue
<script setup lang="ts">
type Rule = { uid: string; name: string };
defineProps<{ rules: Rule[] }>();
</script>

<template>
  <RuleRow v-for="(rule, i) in rules" :key="i" :rule="rule" />
</template>
```

**Good:**

```vue
<script setup lang="ts">
type Rule = { uid: string; name: string };
defineProps<{ rules: Rule[] }>();
</script>

<template>
  <RuleRow v-for="rule in rules" :key="rule.uid" :rule="rule" />
</template>
```
