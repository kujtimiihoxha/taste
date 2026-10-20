---
id: sql/no-redundant-indexes
title: Don't add an index that a key or another index already covers
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: should-fix
stage: diff
source: PostgreSQL docs, "Constraints", "Unique Constraints", https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
quote: "Adding a unique constraint will automatically create a unique B-tree index on the column or group of columns listed in the constraint."
added: 2026-10-19
---

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

A primary key and a unique constraint each come with their own index. A
B-tree index on `(a, b)` can also serve queries on `a` alone. Compare the
actual access requirements before adding an index that appears to do the
same job.

**Why:** PostgreSQL keeps every index up to date on writes, so each one slows
inserts and most updates, and takes disk and memory. A duplicate pays all of
that and speeds up nothing.

**Flag:** `CREATE INDEX` on a primary key or `UNIQUE` column; an index on `(a)`
next to one on `(a, b)`; the same column indexed twice, for example with
`index: true` and again in a later migration, when the existing index
already serves the same access requirements.

**Don't flag:** a smaller index kept on purpose for a hot query, with the
reason stated; a partial or expression index, or one of another type or
operator class (GIN, `text_pattern_ops`), that a plain index can't replace;
needed collation, sort order or covering columns that the existing index
does not provide.

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
