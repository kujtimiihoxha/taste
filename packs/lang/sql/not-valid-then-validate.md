---
id: sql/not-valid-then-validate
title: Add constraints to big tables as NOT VALID, then validate
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: diff
status: draft
source: PostgreSQL docs, "ALTER TABLE", Notes, https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-NOTES
quote: "Scanning a large table to verify new foreign-key, check, or not-null constraints can take a long time, and other updates to the table are locked out until the ALTER TABLE ADD CONSTRAINT command is committed."
added: 2026-10-19
---

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

Adding a foreign key, a `CHECK` or `NOT NULL` to an existing table scans every
row while holding a lock that blocks writes, and for `CHECK` and `NOT NULL`
reads too. On a big table, add the constraint as `NOT VALID` first. That is
quick, and new rows are checked from then on. Then run `VALIDATE CONSTRAINT` in
a separate transaction: it checks the old rows without blocking reads or
writes.

For `NOT NULL` before PostgreSQL 18: add `CHECK (col IS NOT NULL) NOT VALID`,
validate it, then `SET NOT NULL`, which skips the scan when a valid check
proves it (PostgreSQL 12 and later), and drop the check. PostgreSQL 18 can add
the `NOT NULL` constraint itself as `NOT VALID`.

**Why:** The scan can take minutes, and a foreign key also blocks writes to the
table it points at. Adding and validating in the same transaction holds the
strong lock for the whole scan, which is no better than a plain
`ADD CONSTRAINT`.

**Flag:** `ADD FOREIGN KEY`, `REFERENCES` or `ADD CONSTRAINT ... CHECK` on an
existing big table without `NOT VALID`; `ALTER COLUMN ... SET NOT NULL` on a
big table with no validated check behind it; `NOT VALID` and
`VALIDATE CONSTRAINT` in the same transaction; Rails `add_foreign_key` or
`add_check_constraint` without `validate: false`, or `change_column_null` on a
big table.

**Don't flag:** constraints in `CREATE TABLE`, or on a table created in the same
release; small tables; a new column added as `NOT NULL` with a constant
`DEFAULT`, which needs no scan since PostgreSQL 11; those Rails helpers when
strong_migrations' `safe_by_default` is on, since it does this for you.

**Bad:**

```sql
ALTER TABLE orders
  ADD CONSTRAINT orders_total_not_negative CHECK (total_cents >= 0);
```

**Good:**

```sql
ALTER TABLE orders
  ADD CONSTRAINT orders_total_not_negative CHECK (total_cents >= 0) NOT VALID;

-- The next migration, in its own transaction:
ALTER TABLE orders VALIDATE CONSTRAINT orders_total_not_negative;
```
