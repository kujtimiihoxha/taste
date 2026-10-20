---
id: go/package-names
title: Package names say what they provide
applies: ["**/*.go"]
severity: should-fix
stage: both
source: https://go.dev/wiki/CodeReviewComments#package-names; Go Code Review Comments, "Package Names"; Effective Go, "Package names"; The Go Blog, "Package names" (Sameer Ajmani, 2015)
quote: "For example, if you are in package chubby, you don't need type ChubbyFile, which clients will write as chubby.ChubbyFile. Instead, name the type File, which clients will write as chubby.File. Avoid meaningless package names like util, common, misc, api, types, and interfaces."
added: 2026-10-19
---

Name a package for what it provides, in one short lowercase word. Callers
always write the package name, so exported names shouldn't repeat it:
`user.Service`, not `user.UserService`. Don't create `util`, `common`,
`helpers`, `misc`, `shared` or `base` packages.

**Why:** a grab-bag package says nothing about what's in it, grows without
limit, and ends up imported by everything. Repeated names make every call site
longer.

**Flag:** a new package with a grab-bag name; new code added to one; exported
names that repeat the package name (`config.ConfigLoader`, `yaml.YAMLParser`).

**Don't flag:** a package's one main type named after it, as with `ring.Ring`
or `list.List`; existing grab-bag packages that a change only reads from.

**Bad:**

```go
package util

// UserDisplayName returns the name to show for u.
func UserDisplayName(u *user.User) string {
	return u.First + " " + u.Last
}
```

**Good:**

```go
package user

// DisplayName returns the name to show for u.
func (u *User) DisplayName() string {
	return u.First + " " + u.Last
}
```
