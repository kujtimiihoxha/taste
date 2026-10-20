---
id: core/no-single-use-abstraction
title: No abstraction with only one user
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: Google Engineering Practices, "What to look for in a code review", Complexity, https://google.github.io/eng-practices/review/reviewer/looking-for.html; Martin Fowler, "Yagni" (2015); Sandi Metz, "The Wrong Abstraction" (2016)
quote: "A particular type of complexity is over-engineering, where developers have made the code more generic than it needs to be, or added functionality that isn't presently needed by the system."
added: 2026-10-19
---

Don't add an interface, factory, strategy or options type that has one
implementation and one caller. Write the direct code. Add
the abstraction when the second real user shows up, and shape it around both.

**Why:** An abstraction with one user only adds a place to look. It guesses at
a future that usually comes out differently, and then it's in the way.

**Flag:** single-implementation interfaces, factories that build one thing,
options structs with one field.

**Don't flag:** a real boundary (database, network, clock) where tests need a
fake and the interface lives with the code that uses it, or an abstraction the
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
