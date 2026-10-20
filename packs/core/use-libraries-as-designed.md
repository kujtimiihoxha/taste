---
id: core/use-libraries-as-designed
title: Build on a library the way it's meant to be used
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: Rob Pike, "Simplicity" (2023), https://commandcenter.blogspot.com/2023/12/simplicity.html; Joshua Bloch, "Effective Java", 3rd ed. (2018), Item 59 "Know and use the libraries"; Hyrum's Law
quote: "Learn about the systems that already exist, and build on them rather than around them."
added: 2026-10-19
---

When the repo already uses a library or framework for a job, use what it
gives you, the way its docs show for the version the repo has. Don't rebuild
around it what it already does: its loading and error state, its retries, its
caching, its validation. Don't reach into its internals or lean on behavior its
docs don't promise.

**Why:** A library carries the knowledge of the people who built it and of
everyone who used it before you. Code built around it duplicates that, usually
worse, and breaks when the library changes.

**Flag:** hand-written state, retries or caching around a library that already
provides them; calls that the docs for the repo's version replace or
deprecate; reaching into a library's internals or undocumented behavior.

**Don't flag:** a wrapper at a real boundary that adapts the library to this
repo's own types; a documented gap in the library, with a link to it;
deprecations the compiler or linter already reports.

**Bad:**

```tsx
// The app already uses react-query.
const [rules, setRules] = useState<Rule[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error>();
useEffect(() => {
  fetchRules()
    .then(setRules, setError)
    .finally(() => setLoading(false));
}, []);
```

**Good:**

```tsx
const {
  data: rules = [],
  isPending,
  error,
} = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
```
