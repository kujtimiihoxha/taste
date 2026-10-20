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

PostgreSQL indexes the key a foreign key points at, but not the column that
points at it. When you add `REFERENCES` or `FOREIGN KEY`, add an index that
starts with the referencing column, unless one already does. If most rows
leave the column NULL, index only the rest: `WHERE col IS NOT NULL`.

**Why:** Every delete of a parent row, or change of its key, looks up the child
rows that point at it. Without an index, that's a scan of the whole child table
for each parent row, so deleting a user or a post gets slow, and so do joins
from a parent to its children.

**Flag:** a new foreign key whose columns don't start any index on the child
table.

**Don't flag:** a column that already starts an index, such as a composite
primary key or unique constraint that begins with it; ORM helpers that add the
index for you, like Rails' `t.references`; small child tables whose parents are
rarely deleted.

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
