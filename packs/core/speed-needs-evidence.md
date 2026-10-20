---
id: core/speed-needs-evidence
title: Make code faster only with evidence
applies: ["**/*"]
severity: should-fix
stage: both
source: John Ousterhout, "My Favorite Sayings", "The greatest performance improvement of all is when a system goes from not-working to working", https://web.stanford.edu/~ouster/cgi-bin/sayings.php; Rob Pike, "Notes on Programming in C" (1989), rules 1-2
quote: "So, don't worry about performance until the application is running; if it isn't fast enough, then go in and carefully measure to figure out where the performance bottlenecks are (they are likely to be in places you wouldn't have guessed). Tune only the places where you have measured that there is an issue."
added: 2026-10-19
---

Add complexity solely to improve performance only with evidence: a profile,
a benchmark, or a clear algorithmic cost for the expected inputs. Otherwise
keep the plain code.

**Why:** Speed-ups add state, locks and branches that every reader pays for,
and most of them speed up code that was never slow.

**Flag:** caches, parallel work, pools, memoization or lazy initialization
introduced only as a speedup without evidence that the current work is costly.

**Don't flag:** a measured improvement, or a fix for a clear algorithm problem
(N+1 queries, quadratic loops over large inputs) with the reason stated;
concurrency, bounded resources or lazy initialization required for behavior,
responsiveness or initialization order, with that purpose clear.

**Bad:**

```go
var (
	ownerMu    sync.Mutex
	ownerCache = map[string]string{}
)

func ownerOf(r Rule) string {
	ownerMu.Lock()
	defer ownerMu.Unlock()
	if o, ok := ownerCache[r.ID]; ok {
		return o
	}
	o := strings.ToLower(r.Owner)
	ownerCache[r.ID] = o
	return o
}
```

**Good:**

```go
func ownerOf(r Rule) string {
	return strings.ToLower(r.Owner)
}
```
