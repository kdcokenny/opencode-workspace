---
description: Activate iterative plan review loop
---

Activate the iterative plan review loop for this session:

1. Call `review_loop_start` to activate the state machine
2. Call `plan_read` to get the current plan content
3. Delegate to the `reviewer` agent with the full plan content

The loop will automatically cycle based on the reviewer's verdict:
- **REQUEST_CHANGES** — you will be prompted to revise the plan and call `plan_save`
- **APPROVE** — the loop ends and the plan is marked approved
- **NEEDS_DISCUSSION** — the loop pauses; resolve concerns with the user, then re-run `/review-loop`
