---
id: sql/not-null-by-default
title: Make columns NOT NULL unless "no value" is a real state
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: should-fix
stage: diff
status: draft
source: PostgreSQL docs, "Constraints", "Not-Null Constraints", https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-NOT-NULL
quote: "In most database designs the majority of columns should be marked not null."
added: 2026-10-19
---

Mark a column `NOT NULL` when every row should have a value: required
references, flags, statuses, `created_at`. Leave it nullable only when a
missing value means something, like `deleted_at` before anything is deleted,
or an optional parent.

**Why:** A nullable column lets incomplete rows in, and every query then has to
think about NULL: `=` and `<>` skip NULL rows, `NOT IN` breaks, and a boolean
gets a third state. `NOT NULL` costs nothing and puts the rule in the schema.

**Flag:** new columns without `NOT NULL` that the code always fills; booleans
without `NOT NULL` and a default; required foreign keys left nullable; a new
`NOT NULL` column on a table that already has rows, with no `DEFAULT`, which
makes the migration fail. A constant default is instant since PostgreSQL 11.

**Don't flag:** a value that can be unknown or not apply yet; an optional text
field where `NOT NULL` would push the code to store `''` for "none". To make an
existing column of a big table `NOT NULL`, see `sql/not-valid-then-validate`.

**Bad:**

```sql
CREATE TABLE invites (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text,
  as_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);
```

**Good:**

```sql
CREATE TABLE invites (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  as_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
```
