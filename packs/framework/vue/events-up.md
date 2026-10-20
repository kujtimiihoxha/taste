---
id: vue/events-up
title: Children report changes with emits, not callbacks or refs
applies: ["**/*.vue"]
severity: should-fix
stage: diff
status: draft
source: Vue Style Guide, "Implicit parent-child communication", https://vuejs.org/style-guide/rules-use-with-caution.html#implicit-parent-child-communication
quote: "Props and events should be preferred for parent-child component communication, instead of this.$parent or mutating props. An ideal Vue application is props down, events up."
added: 2026-10-19
---

Data goes down to a child as props. When the child wants something changed,
it emits an event, and the parent changes its own state. Don't pass callback
props for this, don't reach up through `$parent`, and don't push values into
a child by writing to it through a template ref. Prop mutation itself is
left to `vue/no-mutating-props`.

**Why:** Events show in the parent's template, where the state changes, and
`defineEmits` lists what a child can ask for. A callback prop, a `$parent`
write or a ref write hides who changes what and ties the child to one parent.

**Flag:** function props the child calls to report something
(`closeDrawer: () => void`, `setValue`); `$parent` or
`getCurrentInstance().parent`; `childRef.value.selected = x` where a prop
would do; an event bus (mitt) between a parent and its own child.

**Don't flag:** deliberately coupled internal parent-child components where
the access is part of their documented contract; function props whose return value the child needs (a
formatter, a validator, a `beforeClose` hook that can cancel); calling a
method a child exposes with `defineExpose` for an imperative action such as
`focus()` or `open()`; an app-wide bus for events between unrelated parts of
an app.

**Bad:**

```vue
<script setup lang="ts">
defineProps<{ title: string; closeDrawer: () => void }>();
</script>

<template>
  <aside>
    <h2>{{ title }}</h2>
    <button @click="closeDrawer()">Close</button>
  </aside>
</template>
```

**Good:**

```vue
<script setup lang="ts">
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <aside>
    <h2>{{ title }}</h2>
    <button @click="emit('close')">Close</button>
  </aside>
</template>
```
