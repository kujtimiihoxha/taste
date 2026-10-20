---
id: sql/no-redundant-indexes
title: Don't add an index that a key or another index already covers
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: should-fix
stage: diff
status: draft
source: PostgreSQL docs, "Constraints", "Unique Constraints", https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
quote: "Adding a unique constraint will automatically create a unique B-tree index on the column or group of columns listed in the constraint."
added: 2026-10-19
---

A primary key and a unique constraint each come with their own index. A
B-tree index on `(a, b)` also serves queries on `a` alone. Don't add a second
index that does the same job.

**Why:** PostgreSQL keeps every index up to date on writes, so each one slows
inserts and most updates, and takes disk and memory. A duplicate pays all of
that and speeds up nothing.

**Flag:** `CREATE INDEX` on a primary key or `UNIQUE` column; an index on `(a)`
next to one on `(a, b)`; the same column indexed twice, for example with
`index: true` and again in a later migration.

**Don't flag:** a smaller index kept on purpose for a hot query, with the
reason stated; a partial or expression index, or one of another type or
operator class (GIN, `text_pattern_ops`), that a plain index can't replace.

**Bad:**

```sql
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE
);

CREATE INDEX users_id_idx ON users (id);
CREATE INDEX users_email_idx ON users (email);
```

**Good:**

```sql
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE
);
```
