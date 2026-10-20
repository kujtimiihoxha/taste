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

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

Mark a column `NOT NULL` when every row should have a value: required
references, flags, statuses, `created_at`. Leave it nullable only when a
missing value means something, like `deleted_at` before anything is deleted,
or an optional parent.

**Why:** A nullable column lets incomplete rows in, and every query then has to
think about NULL: `=` and `<>` skip NULL rows, `NOT IN` breaks, and a boolean
gets a third state. `NOT NULL` enforces the requirement in the schema.

**Flag:** new columns without `NOT NULL` that the code always fills; booleans
left nullable when only true and false are valid; required foreign keys left
nullable; adding a `NOT NULL` column to existing rows without a meaningful
default or staged backfill, which makes the migration fail. A non-volatile
constant default avoids a table rewrite since PostgreSQL 11.

**Don't flag:** a value that can be unknown or not apply yet; an optional text
field where `NOT NULL` would push the code to store `''` for "none"; a
`NOT NULL` column with no default when callers must supply its value. Do not
invent a default just to satisfy a constraint. To make an
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
