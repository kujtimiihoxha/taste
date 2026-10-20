---
id: sql/not-exists-over-not-in
title: Use NOT EXISTS, not NOT IN with a subquery
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: diff
status: draft
source: PostgreSQL wiki, "Don't Do This", "Don't use NOT IN", https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_NOT_IN
quote: "In most cases, the NULL behavior of NOT IN (SELECT …) is not intentionally desired, and the query can be rewritten using NOT EXISTS (SELECT …)"
added: 2026-10-19
---

Write `NOT EXISTS (SELECT 1 FROM b WHERE b.x = a.x)`, not
`a.x NOT IN (SELECT b.x FROM b)`. If the subquery returns even one NULL,
`NOT IN` is never true, and the query returns no rows at all.

**Why:** `x NOT IN (1, NULL)` is NULL, not true, so every row is dropped. The
query passes tests on clean data, then returns nothing in production once a
NULL shows up. It's also slow: through PostgreSQL 18 it can't run as an
anti-join, so on big tables it can take hours. PostgreSQL 19 fixes the speed
only when neither side can be NULL.

**Flag:** `NOT IN (SELECT ...)` and `NOT (x IN (SELECT ...))`; `<> ALL (...)`,
which works the same way; `NOT IN` over a list or array parameter that can
hold a NULL.

**Don't flag:** `NOT IN` with a list of constants, like
`status NOT IN ('done', 'failed')`; a subquery on a small table whose column is
`NOT NULL`, such as its primary key.

**Bad:**

```sql
-- Users who never ordered. orders.user_id is NULL for guest checkouts.
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
