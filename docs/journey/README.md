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
| 5 | Countdown, stopwatch, mode switching, start/pause/reset | Done (tested by script; I still need to check it by eye) |
| 6 | Click-through and hotkeys | Postponed on purpose (I did Step 7 first) |
| 7 | Resize and opacity | Done (tested by script and rendered image; I still need to try edge-dragging by hand) |
| 8 | Settings window (colors, font, time format, timer length, saved settings) | Done (tested by script and rendered images; I still need to try it by hand) |
| 9 | Polish | Next |
| 10 | Package as a real `Clock.app` | Planned |

The full plan is in [`../roadmap.md`](../roadmap.md).

## Read in this order

1. [`01-planning-and-choosing-electron.md`](01-planning-and-choosing-electron.md): the idea, the options I compared, and why Electron.
2. [`02-building-steps-1-to-4.md`](02-building-steps-1-to-4.md): each step, what I built, and what went wrong.
3. [`05-step-5-timer-stopwatch-modes.md`](05-step-5-timer-stopwatch-modes.md): the countdown, stopwatch, mode switching, and start/pause/reset, built as four sub-steps.
4. [`06-step-7-resize-and-opacity.md`](06-step-7-resize-and-opacity.md): resizing with scaling content, and opacity through a safe preload bridge (my first IPC).
5. [`07-step-8-settings-window.md`](07-step-8-settings-window.md): saved settings, the settings window, appearance options, and the validation behind them.
6. [`03-git-and-workflow.md`](03-git-and-workflow.md): the GitHub workflow, the custom skills, and the git hiccups.
7. [`04-interview-prep.md`](04-interview-prep.md): the story in interview form, with likely questions and answers.

## Related docs

- [`../context.md`](../context.md): the requirements and decisions.
- [`../comparison.md`](../comparison.md): the technology comparison.
- [`../roadmap.md`](../roadmap.md): the step-by-step plan.

## Biggest lessons so far

1. **Do the risky step early.** Showing over full-screen apps was the one requirement that could have killed the Electron plan. I tested it at Step 4, not Step 10.
2. **Read errors literally.** Both of my big setup errors were environment problems, not code problems.
3. **Small steps make bugs obvious.** When something broke, only one thing had changed.
4. **Store timestamps, not counters.** Timers built on an end time stay accurate, and can be tested by faking `Date.now`.
5. **A new feature can break an old plan.** The buttons from Step 5 cannot be clicked once Step 6 makes the window click-through.
6. **Scale with one number.** Sizing everything in `rem`, tied to the window width, made resizing almost free.
7. **Look at the real render.** `capturePage()` let me see the UI without any screen permission, and it caught a cramped layout that a numeric check had passed.
8. **Never trust a message, even from your own page.** The main process validates and clamps everything it receives over IPC.
9. **Keep logic out of the framework.** The settings store has no Electron code, so it was tested in plain Node.
10. **If a test fakes something, add a safety net for what it could not prove.** Saving on quit covers the "moved" event my test had to fake.
11. **A broadcast reaches everything.** Moving the clock must not reset the timer, so the page only reacts when a specific value changes.
