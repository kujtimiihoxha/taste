---
id: sql/timestamptz
title: Store points in time as timestamptz
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: should-fix
stage: diff
source: PostgreSQL wiki, "Don't Do This", "Don't use timestamp (without time zone)", https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_timestamp_.28without_time_zone.29
quote: "So if what you want to store is a point in time, rather than a picture of a clock, use timestamptz."
added: 2026-10-19
---

Apply this rule when the database is known to be PostgreSQL. Do not infer
the dialect from a `.sql` file or migration path alone.

Use `timestamptz` (`timestamp with time zone`) for moments: when a row was
created, when a token expires, when something happened. Plain `timestamp`
stores a date and a clock reading with no zone, so the database can't tell
which moment it means.

**Why:** `timestamptz` stores one exact moment and converts it to and from each
session's time zone. With `timestamp`, every writer has to agree on a zone the
column doesn't record, and math across zones or daylight saving changes gives
wrong answers. Storing UTC in `timestamp` by convention has the same problem:
the database doesn't know the values are UTC.

**Flag:** `timestamp` or `timestamp without time zone` for event times in new
columns; `now()::timestamp` or `LOCALTIMESTAMP` saved as an event time.

**Don't flag:** clock readings that aren't moments, like a shop's opening hour,
or a future local appointment stored with its zone name; a new column in a
schema that keeps every time as UTC in `timestamp`, as Rails does by default
for `t.datetime`: match it, and change the convention in its own migration.

**Bad:**

```sql
CREATE TABLE deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sent_at timestamp NOT NULL DEFAULT now(),
  opened_at timestamp
);
```

**Good:**

```sql
CREATE TABLE deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);
```
