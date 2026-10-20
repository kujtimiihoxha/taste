---
id: sql/not-exists-over-not-in
title: Preserve intended NULL behavior in anti-matches
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: diff
status: draft
source: PostgreSQL wiki, "Don't Do This", "Don't use NOT IN", https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_NOT_IN
quote: "In most cases, the NULL behavior of NOT IN (SELECT …) is not intentionally desired, and the query can be rewritten using NOT EXISTS (SELECT …)"
added: 2026-10-19
---

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

Use `NOT EXISTS` for an anti-match when NULLs in a `NOT IN` subquery would
incorrectly discard rows. If the subquery returns any NULL, `NOT IN` cannot
be true for a nonmatching value.

**Why:** `x NOT IN (1, NULL)` is unknown when `x` is not 1, so a `WHERE`
clause excludes it. A query can pass on clean data and return nothing after a
NULL appears. The intended NULL behavior must decide the rewrite: a null
outer value is also excluded by a nonempty `NOT IN` subquery, while a plain
correlated `NOT EXISTS` would include it. Preserve that distinction when it
matters. Performance depends on the version, plan and data; the syntax alone
is not evidence of an outage.

**Flag:** `NOT IN (SELECT ...)`, `NOT (x IN (SELECT ...))`, `<> ALL (...)`,
or a list/array parameter whose possible NULL values make the result differ
from the intended anti-match. Identify the nullable input and the lost rows.

**Don't flag:** deliberately chosen NULL semantics; inputs proven non-null
with no demonstrated performance problem; fixed non-null constant lists,
such as `status NOT IN ('done', 'failed')`.

**Bad:**

```sql
-- Users who never ordered. u.id is a non-null primary key.
-- orders.user_id is NULL for guest checkouts.
SELECT u.id, u.email
FROM users u
WHERE u.id NOT IN (SELECT o.user_id FROM orders o);
```

**Good:**

```sql
SELECT u.id, u.email
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```
