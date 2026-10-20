---
name: taste
description: Plan, review and size-check code changes so they stay small, plain and at the right level, the way a careful senior engineer would. Use for every coding task in a repo where `taste status` works - before writing code for anything bigger than a small fix, before saying a change is done, and for any simplify, cleanup or refactor task.
---

# taste

`taste` is a command-line tool that holds this repo's rules and runs a separate reviewer. Follow these steps every time. Don't skip them because a change looks simple: small changes are where the mess starts.

## Talking with the person

Match the detail to the person's request and familiarity with the work. Use concrete
actions and consistent names; explain unfamiliar project terms when needed.

- In progress updates, report a useful finding, what it means for the work, and what the next action will resolve.
- When asking a question, name the decision and explain how the answer changes the work.
- In the final reply, lead with the result, then the checks that support it and any remaining work or uncertainty. Keep proposed, completed and verified work distinct.

Use these as guidance, not required fields for every message. Remove repetition while
keeping the context, examples and qualifications the person needs to understand.

## 0. Is the repo set up?

Run `taste status`. If it fails, the repo isn't set up: say so once and work as usual. If it shows a review in progress, `taste findings` shows where it stands.

## 1. Plan anything bigger than a small fix

1. Run `taste plan`. It shows what to look up first, the plan format, when to ask the person, and the rules for plans.
2. Do the lookups and write the plan.
3. Send it for review on stdin (or as a path to a file outside the repo):

   ```sh
   taste review --plan - <<'EOF'
   # Plan: ...
   EOF
   ```

   Change the plan, or answer each finding with `taste reply`, and send it again until Taste approves it.

4. Show the person the Taste-approved plan, ask for their approval, and wait for an explicit go-ahead before writing code. If they request changes, update the plan and repeat the review and approval steps.

While you code, stay inside the plan. If you need files the plan didn't name, or the change grows past it, stop, update the plan, and repeat the Taste review and user approval steps. Don't hack around a plan that turned out wrong.

## 2. Write the code

`taste rules` shows the rules for the files you're changing. The ones that matter most:

- Make the smallest change that does the job. Reuse code before adding code.
- Check outside input once, where it enters. Never re-check what's already guaranteed.
- No abstraction with only one user. No speed-ups without evidence.
- Tests check behavior through the public API, and can fail.
- Never copy a pattern the repo's dont-copy notes list, even if nearby code does it.

## 3. Before you say it's done

1. Run the tests and linters.
2. Run `taste review`. Its first line says what it reviews. For each finding, fix it, or answer it with the guarantee or reason that makes it wrong: `taste reply F2 "disagree: NewStore always sets items"`. Only answer ids from the latest review; `taste findings` lists them. Then run `taste review` again.
3. Done means `taste review` approved. If it stops after 3 rounds (exit code 3), show the open findings to the person instead of saying you're done.

## Simplify, cleanup and refactor tasks

Run `taste simplify` before changing anything, and follow what it prints. Find out why code is there before you delete it, and keep the tests passing: a simplification never changes behavior. At the end, `taste budget` should say "Within budget". If it doesn't, cut what you added, or be ready to say what each addition is for when the reviewer asks. Then run `taste review`: an approved review ends the pass.

## When the person suggests a change

Check its premise first when that's cheap: measure it, or read the code it touches. If the evidence disagrees, show it, with the numbers, and say what you'd do instead. The person decides, and then you follow their call. A suggestion still goes through the plan and review steps like any other change.

## When to ask the person

In addition to plan approval, ask when the task is unclear in a way that changes the plan, the change is hard to undo (public API, data format, migration, security), you and the reviewer still disagree when the rounds run out, or the code you're changing had recent incidents. Otherwise keep going.
