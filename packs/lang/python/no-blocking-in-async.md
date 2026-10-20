---
id: python/no-blocking-in-async
title: Don't call blocking code from async def
applies: ["**/*.py"]
severity: must-fix
stage: both
status: draft
source: Python docs, asyncio "Coroutines and Tasks", "Running in Threads", https://docs.python.org/3/library/asyncio-task.html#running-in-threads
quote: "Directly calling blocking_io() in any coroutine would block the event loop for its duration, resulting in an additional 1 second of run time."
added: 2026-10-19
---

Inside a coroutine, every call must return quickly or be awaited. Run
blocking I/O, such as a sync SDK or database client or a serial port, with
`await asyncio.to_thread(...)`, or use the library's async client.

**Why:** One event loop runs every task. A blocking call stops all of them
until it returns, so one slow device or query stalls the whole service.
ruff's default ASYNC rules flag blocking HTTP calls, subprocesses, `open()`
and `time.sleep()` inside `async def`. They can't know which other library
calls block, and that is where review has to look.

**Flag:** calls to sync clients (boto3, `sqlite3`, `psycopg2`, `redis`,
vendor SDKs) inside `async def`; a `threading.Lock` that other threads also
take, acquired in a coroutine or an event loop callback; a plan that picks a
sync library for code that runs on asyncio.

**Don't flag:** calls that only touch memory; code already wrapped in
`to_thread` or `run_in_executor`; a script where `asyncio.run()` drives one
task and nothing else waits on the loop.

**Bad:**

```python
# self.client is the vendor's sync SDK; get_status() makes an HTTP request.
async def refresh(self) -> None:
    self.status = self.client.get_status()
```

**Good:**

```python
# self.client is the vendor's sync SDK; get_status() makes an HTTP request.
async def refresh(self) -> None:
    self.status = await asyncio.to_thread(self.client.get_status)
```
