---
id: core/no-single-use-abstraction
title: No abstraction with only one user
applies: ["**/*"]
severity: should-fix
stage: both
source: Google Engineering Practices, "What to look for in a code review", Complexity, https://google.github.io/eng-practices/review/reviewer/looking-for.html; Martin Fowler, "Yagni" (2015); Sandi Metz, "The Wrong Abstraction" (2016); taste's one-user default
quote: "A particular type of complexity is over-engineering, where developers have made the code more generic than it needs to be, or added functionality that isn't presently needed by the system."
added: 2026-10-19
---

Taste's default is not to add an interface, factory, strategy or options type
with one implementation and one caller. Write the direct code unless the
abstraction serves a present role listed below. Otherwise add it when the
second real user shows up, and shape it around both.

**Why:** An abstraction for a hypothetical second user adds a place to look
and guesses at requirements that may turn out differently. The source warns
against speculative genericity; the one-user default is taste's policy.

**Flag:** single-implementation interfaces, factories that build one thing,
and options structs with one field when none of the present roles below
applies.

**Don't flag:** a real boundary (database, network, clock) where tests need a
fake and the interface lives with its consumer; a required protocol or
framework interface; a public extension point; construction, access or
ownership boundaries that preserve a present invariant; an abstraction the
plan says gets its second user in this same change.

**Bad:**

```go
type RuleFormatter interface {
	Format(r Rule) string
}

type textRuleFormatter struct{}

func (textRuleFormatter) Format(r Rule) string {
	return r.Name + ": " + r.Expr
}

func NewRuleFormatter() RuleFormatter { return textRuleFormatter{} }

line := NewRuleFormatter().Format(rule)
```

**Good:**

```go
func formatRule(r Rule) string {
	return r.Name + ": " + r.Expr
}

line := formatRule(rule)
```
