---
id: sql/expand-then-contract
title: Don't rename or drop what running code still uses
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: both
source: Andrew Kane, strong_migrations README, "Renaming a column", https://github.com/ankane/strong_migrations#renaming-a-column
quote: "Renaming a column that's in use will cause errors in your application."
added: 2026-10-19
---

Migrations run while the old version of the app is still serving requests.
Don't rename or drop a column or table, or change its type, in the same deploy
as the code that stops using the old one. Expand, then contract: add the new
column, deploy code that writes both, backfill, move reads to the new column,
and drop the old one in a later deploy.

It works the other way too: a step that needs the new code, like making a
column `NOT NULL` that old code doesn't fill, or backfilling data that only the
new code writes, runs after the deploy.

**Why:** During a deploy, old code still reads and writes the old names. It
fails until every instance has restarted, and rolling back to it fails too.
Changing a column's type in place also rewrites the whole table under a lock.

**Flag:** `RENAME COLUMN`, `RENAME TO`, `DROP COLUMN`, `DROP TABLE` or
`ALTER COLUMN ... TYPE` in the same change as the code that stops using the old
name; Rails `remove_column` without the column in `ignored_columns` in an
earlier deploy; `SET NOT NULL` on a column the deployed code doesn't write yet.

**Don't flag:** columns and tables no released code has used (see
`core/no-compat-for-nobody`); apps whose deploy stops all old code before
migrating; type changes that old code still accepts, on a small table or with
no rewrite, like raising a `varchar` limit.

**Bad:**

```sql
-- Same deploy as the code change from "name" to "display_name".
ALTER TABLE users RENAME COLUMN name TO display_name;
```

**Good:**

```sql
-- Deploy 1, with code that writes both columns:
ALTER TABLE users ADD COLUMN display_name text;

-- A later deploy, after the backfill, once no running code uses "name":
ALTER TABLE users DROP COLUMN name;
```
