# The Clock journey

This folder tells the story of building the Clock app: what I wanted, the decisions I made, and every hiccup along the way. It is written so I can learn from it, explain it to other people, and use it to prepare for interviews.

I built this with an AI assistant (Claude Code) guiding me step by step. I had never used Electron before, so I went slowly and tested after every step.

## The one-line summary

A small always-on-top clock for macOS that floats in the top-right corner and stays visible over every app, even full-screen YouTube, so I get distracted less.

## Where it stands

| Step | What | Status |
|---|---|---|
| 1 | Hello window | Done |
| 2 | Live ticking time | Done |
| 3 | Frameless, always-on-top corner clock | Done |
| 4 | Visible over full-screen apps | Done (the risky one, and it worked) |
| 5 | Countdown, stopwatch, mode switching | Next |
| 6 | Click-through and hotkeys | Planned |
| 7 | Resize and opacity | Planned |
| 8 | Settings window | Planned |
| 9 | Polish | Planned |
| 10 | Package as a real `Clock.app` | Planned |

The full plan is in [`../roadmap.md`](../roadmap.md).

## Read in this order

1. [`01-planning-and-choosing-electron.md`](01-planning-and-choosing-electron.md): the idea, the options I compared, and why Electron.
2. [`02-building-steps-1-to-4.md`](02-building-steps-1-to-4.md): each step, what I built, and what went wrong.
3. [`03-git-and-workflow.md`](03-git-and-workflow.md): the GitHub workflow, a custom push skill, and the git hiccups.
4. [`04-interview-prep.md`](04-interview-prep.md): the story in interview form, with likely questions and answers.

## Related docs

- [`../context.md`](../context.md): the requirements and decisions.
- [`../comparison.md`](../comparison.md): the technology comparison.
- [`../roadmap.md`](../roadmap.md): the step-by-step plan.

## Biggest lessons so far

1. **Do the risky step early.** Showing over full-screen apps was the one requirement that could have killed the Electron plan. I tested it at Step 4, not Step 10.
2. **Read errors literally.** Both of my big setup errors were environment problems, not code problems.
3. **Small steps make bugs obvious.** When something broke, only one thing had changed.
