---
id: sql/index-foreign-keys
title: Index the referencing column of a foreign key
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: should-fix
stage: diff
status: draft
source: PostgreSQL docs, "Constraints", "Foreign Keys", https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
quote: "Since a DELETE of a row from the referenced table or an UPDATE of a referenced column will require a scan of the referencing table for rows matching the old value, it is often a good idea to index the referencing columns too."
added: 2026-10-19
---

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

PostgreSQL indexes the key a foreign key points at, but not the column that
points at it. When parent deletes, key updates or child lookups need it,
add an index on the referencing columns unless one already serves those
queries. For equality on every column of a composite foreign key, those
columns can lead a B-tree index in either order. If most rows leave a single
foreign-key column NULL, a partial index can omit them: `WHERE col IS NOT NULL`.

**Why:** Every delete of a parent row, or change of its key, looks up the child
rows that point at it. Without an index, that's a scan of the whole child table
for each parent row, so deleting a user or a post gets slow, and so do joins
from a parent to its children.

**Flag:** a new foreign key whose child lookups would scan a large table
during parent deletes, key updates or expected queries, with no suitable
index. Name the operation that needs it.

**Don't flag:** an existing index with the foreign-key columns as its leading
columns, including a suitable primary key or unique index; ORM helpers that
add the index, like Rails' `t.references`; small child tables whose parents
are rarely deleted; a workload with no relevant child lookups, parent deletes
or key updates. Avoid an index whose maintenance has no useful query to serve.

**Bad:**

```sql
CREATE TABLE comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  body text NOT NULL
);
```

**Good:**

```sql
CREATE TABLE comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  body text NOT NULL
);

CREATE INDEX comments_post_id_idx ON comments (post_id);
```
