---
id: sql/dont-edit-shipped-migrations
title: Don't edit a migration that has already run; add a new one
applies: ["**/*.sql", "**/migrations/**", "**/db/migrate/**"]
severity: must-fix
stage: diff
status: draft
source: Rails Guides, "Active Record Migrations", "Changing Existing Migrations", https://guides.rubyonrails.org/active_record_migrations.html#changing-existing-migrations
quote: "You will be creating extra work for yourself and your co-workers and cause major headaches if the existing version of the migration has already been run on production machines."
added: 2026-10-19
---

Migration tools record which migrations have run and never run them again. An
edit to a migration that has shipped never reaches the databases that already
ran it, so they drift apart from new installs. Put the change in a new
migration.

**Why:** Production, staging and every developer's database keep the old
version. The schema then depends on when each database was created, and bugs
show up on only some of them.

**Flag:** changes to a migration file that is already on the main branch or in
a release, other than comments (with Flyway, which checksums applied files,
comments count too); renaming or deleting such a file.

**Don't flag:** a migration added earlier in the same unmerged branch;
migrations no deployed database has run yet (see `core/no-compat-for-nobody`);
deleting old migrations when new databases are built from a schema file, which
the Rails guide allows; a deliberate fix to an old migration that no longer
runs on fresh installs, when the change says why and the end schema stays the
same.

**Bad:**

```sql
-- migrations/0007_create_users.sql, deployed last month, now edited:
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  locale text NOT NULL DEFAULT 'en'
);
```

**Good:**

```sql
-- migrations/0012_add_users_locale.sql, a new file:
ALTER TABLE users ADD COLUMN locale text NOT NULL DEFAULT 'en';
```
