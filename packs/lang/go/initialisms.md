---
id: go/initialisms
title: Keep initialisms in one case (URL, ID, HTTP)
applies: ["**/*.go"]
severity: nit
stage: diff
source: https://go.dev/wiki/CodeReviewComments#initialisms; Go Code Review Comments, "Initialisms"; Google Go Style Guide, Decisions, "Initialisms"
quote: 'Words in names that are initialisms or acronyms (e.g. "URL" or "NATO") have a consistent case.'
added: 2026-10-20
---

In a Go name, an initialism is all upper case or all lower case, never
mixed: `userID`, `baseURL`, `HTTPClient`, `ServeHTTP`. Not `userId`,
`baseUrl` or `HttpClient`.

**Why:** the standard library and most Go code spell them this way, so a
mixed form reads like a different word, and the same name ends up spelled two
ways in one package.

**Flag:** new identifiers with `Id`, `Url`, `Http`, `Json`, `Api`, `Sql` and
the like.

**Don't flag:** generated code, such as protobuf output; strings, such as
JSON tags and log keys, which follow their own format; exported names whose
rename would break users; repos that turn on staticcheck's ST1003, which
reports this already (golangci-lint leaves it off by default).

**Bad:**

```go
func userUrl(baseUrl, userId string) string { return baseUrl + "/users/" + userId }
```

**Good:**

```go
func userURL(baseURL, userID string) string { return baseURL + "/users/" + userID }
```
