---
id: sql/no-app-code-in-migrations
title: Migrations don't use the app's models or constants
applies: ["**/migrations/**", "**/db/migrate/**"]
severity: should-fix
stage: diff
source: Django docs, "Migrations", "Historical models", https://docs.djangoproject.com/en/stable/topics/migrations/#historical-models
quote: "If you import models directly rather than using the historical models, your migrations may work initially but will fail in the future when you try to rerun old migrations (commonly, when you set up a new installation and run through all the migrations to set up the database)."
added: 2026-10-19
---

A data migration has to run again later, on fresh installs, next to code that
has changed since it was written. Write it in SQL, or with the frozen models
the tool gives you: Django's `apps.get_model`, or a small model class defined
inside a Rails migration. Copy enum values and constants into the migration as
literals. This is the exception to `core/reuse-before-adding`: the migration
needs the values as they were when it was written.

**Why:** App models, enums, settings and services get renamed, changed and
deleted. A migration that imports them works today, then breaks the next fresh
install, or quietly does something different from what it did when it ran.

**Flag:** app model imports in migration files (`from shop.models import Order`,
`User.where(...)` in a Rails migration); calls to app services, jobs or
settings from a migration; app enums or constants like `Order.Status.PENDING`
or `Reviewable.statuses[:approved]`.

**Don't flag:** `apps.get_model(...)` in Django; a model class defined inside
the migration, with its table name set; framework-supported serialized
references to custom fields, managers or functions whose historical behavior
is kept compatible; Django's `settings.AUTH_USER_MODEL` with
`swappable_dependency`. These supported migration dependencies do not justify
calling changing business logic.

**Bad:**

```python
from django.db import migrations

from shop.models import Order


def close_pending(apps, schema_editor):
    Order.objects.filter(status=Order.Status.PENDING).update(status=Order.Status.CLOSED)


class Migration(migrations.Migration):
    dependencies = [("shop", "0041_order_closed_at")]
    operations = [migrations.RunPython(close_pending, migrations.RunPython.noop)]
```

**Good:**

```python
from django.db import migrations


def close_pending(apps, schema_editor):
    Order = apps.get_model("shop", "Order")
    Order.objects.filter(status="pending").update(status="closed")


class Migration(migrations.Migration):
    dependencies = [("shop", "0041_order_closed_at")]
    operations = [migrations.RunPython(close_pending, migrations.RunPython.noop)]
```
