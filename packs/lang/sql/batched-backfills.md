---
id: sql/batched-backfills
title: Backfill big tables in batches, outside the schema change
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: both
status: draft
source: Andrew Kane, strong_migrations README, "Backfilling data", https://github.com/ankane/strong_migrations#backfilling-data
quote: "There are three keys to backfilling safely: batching, throttling, and running it outside a transaction."
added: 2026-10-19
---

Don't fill a column for every row of a big table in one `UPDATE`, and never in
the same transaction as the `ALTER TABLE` that added it. Run the backfill as
its own step with no transaction around it, in batches of a few thousand rows
by primary key range (not `OFFSET`), and skip rows that already have the value.

A column with a volatile default, like `DEFAULT gen_random_uuid()`, rewrites
the whole table when it's added. Add the column without the default, set the
default for new rows, then backfill the old ones in batches.

**Why:** The lock that `ALTER TABLE` takes is held until its transaction
commits, so a backfill in the same transaction keeps the whole table locked
until the last row is written. One huge `UPDATE` also locks every row it
touches and writes a new version of each in one long transaction. Batches
commit as they go, and a failed run can pick up where it stopped.

**Flag:** an `UPDATE` of every row of an existing table in the migration that
adds or changes the column; one `UPDATE` or `DELETE` over millions of rows; a
Rails backfill without `disable_ddl_transaction!`, or `update_all` without
batches; a Django `RunPython` over every row in an atomic migration;
`ADD COLUMN` with a volatile default on a big table.

**Don't flag:** a new column where every row gets the same constant:
`ADD COLUMN ... DEFAULT 'x'` needs no backfill and no rewrite since PostgreSQL
11; small tables; updates that touch a few rows through an index.

**Bad:**

```sql
BEGIN;
ALTER TABLE users ADD COLUMN email_normalized text;
UPDATE users SET email_normalized = lower(email);
COMMIT;
```

**Good:**

```sql
ALTER TABLE users ADD COLUMN email_normalized text;

-- A later step with no transaction around it, run for each id range in turn:
UPDATE users SET email_normalized = lower(email)
WHERE id >= 1 AND id < 10001 AND email_normalized IS NULL;
```
