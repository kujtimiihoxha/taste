---
id: core/dont-break-users
title: Don't break what users already depend on
applies: ["**/*"]
severity: must-fix
stage: both
status: draft
source: Hyrum Wright, "Hyrum's Law", https://www.hyrumslaw.com/; Software Engineering at Google (2020), ch. 1 and ch. 15
quote: "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody."
added: 2026-10-20
---

Once something has shipped, people build on it: an exported function, a flag,
a config key, a stored or wire format, a metric name, an error code, an output
format. Don't rename, remove or change it in a way that breaks them. Add the new thing next to the old one and deprecate the old
one, or make the break on purpose: in a major version, with a note that says
what users must do.

**Why:** An unintended break can stop existing consumers from working after
an upgrade. Consumers may depend on more than the docs promise.

**Flag:** with no deprecation, major version or upgrade note: a renamed or
removed flag, config key, field, endpoint, metric or exported function that a
release already shipped; a changed default or output format; a new required
parameter on a public function.

**Don't flag:** anything not released or shared yet (see
`core/no-compat-for-nobody`); internal code whose callers change atomically and
which has no separately deployed or persisted consumers; an intentional break
or bug correction whose migration and rollout requirements the change
addresses; new wording for a message meant for people, unless the repo says
tools parse it.

**Bad:**

```go
type ScrapeConfig struct {
	// Renamed from scrape_timeout to match the other fields.
	Timeout time.Duration `yaml:"timeout"`
}
```

**Good:**

```go
type ScrapeConfig struct {
	// Users' config files already set scrape_timeout.
	Timeout time.Duration `yaml:"scrape_timeout"`
}
```
