---
id: sql/create-index-concurrently
title: Build indexes on live tables with CONCURRENTLY
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: diff
source: PostgreSQL docs, "CREATE INDEX", "Building Indexes Concurrently", https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY
quote: "Very large tables can take many hours to be indexed, and even for smaller tables, an index build can lock out writers for periods that are unacceptably long for a production system."
added: 2026-10-19
---

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

A plain `CREATE INDEX` blocks every insert, update and delete on the table
until the build finishes. On a table that already serves traffic, use
`CREATE INDEX CONCURRENTLY`.

`CONCURRENTLY` can't run inside a transaction block, so run that step outside
the migration's transaction (Rails: `algorithm: :concurrently` with
`disable_ddl_transaction!`; Django: `AddIndexConcurrently` in a non-atomic
migration). If the build fails, it leaves an `INVALID` index behind: drop it
and build again, because `IF NOT EXISTS` would keep the broken one.

**Why:** On a big table the build takes minutes or hours, and every write waits
for it. A concurrent build takes longer, but writes keep working.

**Flag:** `CREATE INDEX` or `CREATE UNIQUE INDEX` without `CONCURRENTLY` on an
table serving writes when the build would block them unacceptably; Rails
`add_index` or `add_reference` in that situation without
`algorithm: :concurrently`.

**Don't flag:** indexes on a table created in the same migration, which is
still empty; tables the change shows are small; an offline build or planned
maintenance window where blocking writes is acceptable; those Rails helpers when
strong_migrations' `safe_by_default` is on, since it builds the index
concurrently for you; a partitioned table, which can't be indexed concurrently
at the top: build the index on each partition with `CONCURRENTLY`, then create
it on the parent.

**Bad:**

```sql
-- A migration on orders, a big table that takes writes all day.
CREATE INDEX orders_customer_id_idx ON orders (customer_id);
```

**Good:**

```sql
CREATE INDEX CONCURRENTLY orders_customer_id_idx ON orders (customer_id);
```
