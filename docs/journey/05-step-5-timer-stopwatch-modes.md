# 05: Step 5, countdown, stopwatch, and modes

**Goal:** turn the clock into a clock, a countdown timer, and a stopwatch, with a way to switch between them and to start, pause, and reset.

This was a bigger step than the earlier ones, so I split it into four sub-steps. Each one was built, tested, committed, and pushed on its own, which gave four commits. Each commit leaves the app in a working state, but the first three are deliberately incomplete (for example, a Start button with no Pause).

| Sub-step | Commit message | What it added |
|---|---|---|
| 5a | add countdown timer with adjustable duration | Countdown from a set duration to 00:00 |
| 5b | add stopwatch that counts up with tenths | Stopwatch counting up |
| 5c | add mode button to switch clock timer stopwatch | One display at a time, with a mode button |
| 5d | add start pause and reset for timer and stopwatch | Pause, resume, and reset for both |

## 5a: Countdown timer

**What I built:** a `− 25:00 +` timer with a Start button. The minus and plus buttons change the duration in one-minute steps, from 1 to 99 minutes. At zero the display shows `00:00` in red.

### Key design decision: store the end time, do not count ticks

The simple way to write a countdown is to subtract one second every time a timer fires. That is wrong, because `setInterval` is not exact. If a tick runs late (the computer is busy, or the window is in the background), the countdown quietly falls behind the real clock.

Instead, when the timer starts I save the moment it will reach zero:

```js
timer.endTime = Date.now() + timer.durationMs;
```

On every tick I work out `endTime - Date.now()`. The display is then always correct, no matter how late a tick runs.

### Smaller decisions

- **`Math.ceil` for the countdown display.** `25:00` stays on screen for a full second after starting, and the display only reaches `00:00` at the exact moment the countdown ends. With `Math.floor` it would show `00:00` for a whole second before finishing.
- **`acceptFirstMouse: true` in `main.js`.** Normally the first click on a window only brings it to the front. Because the clock sits over other apps, I want the first click to press the button.
- **`-webkit-app-region: no-drag` on buttons.** The whole window is a drag handle (from Step 3). Without this, clicking a button would drag the window instead.
- **The refresh loop went from 250 ms to 100 ms.** It was added for the stopwatch tenths in 5b, but I switched here because everything shares one loop.

### How I tested a 25-minute timer

I did not wait 25 minutes. A test script clicked the buttons in the real app, and then replaced `Date.now` inside the page so that it jumped 25 minutes forward:

```js
Date.now = () => real() + 25 * 60 * 1000;
```

This only works because of the end-time design above: the timer reads `Date.now()` every time, so moving the clock moves the timer. If I had counted ticks, I could not have tested it this way.

Checks passed: the minimum (01:00) and maximum (99:00) limits, counting down about 2 seconds after Start, the buttons locking while running, and 00:00 in red with the buttons unlocking at the end.

## 5b: Stopwatch

**What I built:** a `00:00.0` display (minutes, seconds, tenths) with a Start button.

The same idea applies in reverse: I save when the run began (`startTime`) and compute `Date.now() - startTime`. I also added `elapsedBeforeMs`, the time counted in earlier runs, which stays at 0 until pause exists in 5d. Adding it now meant 5d was a small change.

**Tested:** it stays at `00:00.0` before Start, shows `00:02.4` about 2.5 seconds after Start, and shows `61:07.7` when I jumped time forward 61 minutes. The timer and clock were not affected.

At this point the window showed the clock, the timer, and the stopwatch stacked, so I made it taller (160 px). That was temporary.

## 5c: Mode switching

**What I built:** one display at a time, plus a mode button that cycles Clock, Timer, Stopwatch.

- Each display and each group of controls has a `data-mode` attribute. `setMode()` hides everything that does not belong to the current mode.
- **The timer and stopwatch keep running while hidden.** I start a countdown, switch to the clock, and it carries on. I tested this by starting both, cycling back to the clock, and then checking that they had moved.
- **A CSS pitfall I avoided:** a rule like `display: flex` overrides the HTML `hidden` attribute, so hidden things can stay visible. I added `[hidden] { display: none !important; }` to make `hidden` always win.
- The window went back down to 110 px tall, since only one display shows now.

**Tested:** for each mode, only the right display and buttons are visible, and the whole layout fits inside the 220×110 window.

## 5d: Start, pause, and reset

**What I built:** a ▶ / ⏸ toggle and a ↺ reset for both the timer and the stopwatch.

### The timer has four states

| State | How I know | Display |
|---|---|---|
| idle | nothing set | the full duration |
| running | `endTime` is set | counts down |
| paused | `pausedRemainingMs` is set | frozen |
| finished | reached zero | `00:00` in red |

Thinking in states made the button rules simple:

- ▶ starts from idle or finished, resumes from paused, and becomes ⏸ while running.
- Reset is disabled when idle (there is nothing to reset).
- Minus and plus only work in idle or finished, so you cannot change the duration mid-countdown.
- Pressing ▶ when finished restarts from the full duration.

### Pause

Pausing the timer saves the time left (`endTime - Date.now()`) and clears `endTime`. Resuming sets a new `endTime` from the saved value. The stopwatch does the same in the other direction: it adds the finished run to `elapsedBeforeMs` and clears `startTime`.

### Why icons and not words

The timer row already holds mode, minus, plus, play, and reset. Words like "Start" and "Reset" would not fit in 220 px. ▶ and ↺ do, and the `title` attribute still gives the word on hover (Start, Pause, Resume, Reset).

**Tested (all passed):** pause freezes the display (`24:58` stayed `24:58` for 1.5 s), resume continues from there, reset returns to the start state, the finished state works, and the layout fits in all three modes.

## Hiccups in this step

None that broke anything. The main risk was testing: I could not wait 25 minutes or watch the window, so I tested logic by clicking buttons from a script and moving `Date.now` forward.

## What I have not verified

- **How it looks.** I tested the logic and the layout sizes, but I have not eyeballed the buttons and spacing myself.
- **Clicking with a real mouse.** My tests call `button.click()` in code. I still need to check that clicking works while another app (such as Chrome) is in front, which is what `acceptFirstMouse` is for, and on a non-activating panel.
- **The finished state has no alert.** At 00:00 it only turns red. A sound or a stronger signal is planned for Step 9.

## Lessons

1. **Store timestamps, not counters.** An end time or a start time stays correct when ticks run late, and it makes the code testable by faking `Date.now`.
2. **Name your states.** Four named timer states turned a pile of button rules into simple conditions.
3. **Split a big step.** Four small commits, each one tested, meant nothing was ever far from working.
4. **A new feature can break an old plan.** The buttons I added in this step cannot be clicked once the window is click-through. That is exactly what Step 6 has to solve.

## What is next

Step 6: click-through and hotkeys. The window will ignore the mouse so it never blocks what is underneath, and a global hotkey will turn click-through off so I can drag it or press its buttons. Hotkeys for start/pause and for switching modes will matter even more now, because with click-through on, the buttons cannot be clicked.
