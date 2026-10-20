---
id: shell/wait-each-pid
title: Wait on each background job, not on all of them
applies: ["**/*.sh", "**/*.bash"]
severity: must-fix
stage: diff
status: draft
source: POSIX.1-2024, "wait", https://pubs.opengroup.org/onlinepubs/9799919799/utilities/wait.html
quote: "If the wait utility is invoked with no operands, it shall wait until all process IDs known to the invoking shell have terminated and exit with a zero exit status."
added: 2026-10-19
---

This is the background-job form of `core/dont-hide-failures`.
`wait` with no arguments returns 0, even when every job failed. When a script
starts jobs with `&` and their results matter, save each `$!` and run
`wait "$pid"` for each one. `wait "$a" "$b"` is not enough: it returns the
status of the last PID only.

**Why:** The script reports success after half the deploys or builds failed,
and the only sign is an error line that scrolled past.

**Flag:** `cmd &` in a loop followed by a bare `wait`; `wait "$pid1" "$pid2"`
when every job's result matters.

**Don't flag:** jobs whose failure doesn't matter (cache warming, best-effort
cleanup); a `wait -n` loop (bash 4.3+) that checks each status; `xargs -P` or
GNU `parallel`, which exit non-zero when a job fails.

**Bad:**

```bash
for host in "${hosts[@]}"; do
  ssh "$host" ./deploy.sh &
done
wait
echo "deployed to ${#hosts[@]} hosts"
```

**Good:**

```bash
pids=()
for host in "${hosts[@]}"; do
  ssh "$host" ./deploy.sh &
  pids+=("$!")
done
for pid in "${pids[@]}"; do
  wait "$pid" || exit
done
echo "deployed to ${#hosts[@]} hosts"
```
