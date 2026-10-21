---
id: core/retry-safe-operations
title: Retry only when repeating the operation is safe
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/; Amazon Builders' Library, "Timeouts, retries, and backoff with jitter"
quote: "In general, our view is that APIs with side effects aren't safe to retry unless they provide idempotency."
added: 2026-10-21
---

Before adding a retry, establish why another attempt cannot repeat an unwanted
side effect. A timeout or lost response does not prove the first attempt
failed to apply. Use the operation's existing guarantee for safe retries;
otherwise return the failure instead of guessing.

**Why:** the server may finish a write before the response is lost. Retrying
can create a second job or send a second notification even with a delay and
a small attempt limit.

**Flag:** a new or changed retry path that can repeat an unwanted side effect
after an ambiguous failure, without a guarantee preventing duplicates. Name
the repeated effect and why the retry can reach it. Generating a new
deduplication key for each attempt does not protect one logical operation.

**Don't flag:** operations whose contract makes repetition safe; a stable
operation key the receiver uses to suppress duplicates; errors that guarantee
no effect occurred; repeated effects the product explicitly allows. Keep
existing library retry guarantees (`core/use-libraries-as-designed`); don't
add a retry framework or deduplication store just to satisfy this rule.

**Bad:**

```ts
// Each accepted createJob call creates a new job; the API has no deduplication guarantee.
async function submitExport(input: ExportInput): Promise<Job> {
  try {
    return await client.createJob(input);
  } catch (error) {
    if (!isTimeout(error)) throw error;
    return client.createJob(input);
  }
}
```

**Good:**

```ts
// Each accepted createJob call creates a new job; the API has no deduplication guarantee.
async function submitExport(input: ExportInput): Promise<Job> {
  return client.createJob(input);
}
```
