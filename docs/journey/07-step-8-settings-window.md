# 07: Step 8, the settings window

**Goal:** a separate window where I can customize the clock (size, opacity, colors, font, position, time format, timer length), with everything remembered between launches.

This was the biggest step so far, so I split it into three sub-steps and committed each one.

| Sub-step | Commit | Commit message |
|---|---|---|
| 8a | `7ce88bc` | save size position and opacity between launches |
| 8b | `084d0f0` | add settings window with opacity size and position |
| 8c | `9e63ab3` | add colors font time format timer length and reset |

Hotkeys are not in the settings window yet. They depend on Step 6, which is postponed.

## 8a: Settings that persist

### The problem

Until now, size and opacity reset every time the app started. To fix that, the settings have to be saved to a file and loaded again.

### Design: a settings store that does not know about Electron

`settings.js` holds the storage logic, and it never imports Electron. That was deliberate: a file that only uses Node's `fs` and `path` can be tested with plain `node`, without opening any window. I wrote 22 checks for it before wiring it into the app.

What it does:

- **Defaults.** One `DEFAULTS` object is the single place that says what every setting starts as.
- **Validators.** There is one small checker per setting. Each returns a clean value, or `undefined` if the input is not usable. Settings come from a file on disk and from the page, and neither is trusted.
- **`applyValid(base, input)`.** Copies only the usable values over the base. Unknown keys, wrong types, and out-of-range values are skipped or clamped. A bad value never replaces a good one.
- **Debounced saving.** Dragging a window changes its position many times a second, so the file is written 300 ms after the last change, not on every change.
- **Atomic writing.** It writes to `settings.json.tmp` and then renames it. If the computer crashes mid-write, the real file is never left half-written.
- **Damaged files.** A missing file, broken JSON, a file holding an array, and a file with some bad fields all fall back safely: bad fields get defaults, good fields are kept.

### Wiring it into the app

- `main.js` loads settings at startup and creates the clock window at the saved position and size.
- It remembers the window's position and size when it is moved or resized.
- If the saved position is on a screen that no longer exists (for example an unplugged monitor), the clock goes to the top-right corner of the main screen instead of being lost off-screen.
- The Step 7 opacity-only message was replaced by general `settings:get` and `settings:update` messages. The ◐ button now steps down from the *current* opacity, so it still makes sense after the opacity was set elsewhere.
- Whenever settings change, the main process sends them to every open window (`broadcastSettings`), so all windows stay in sync.

### Hiccup: `setBounds()` does not fire "moved" or "resized"

My test moved the window from code and found nothing saved. In Electron, `moved` and `resized` fire when the user moves or resizes a window, not when code does. I had to emit them by hand in the test, which meant I had not proved that a real drag fires them.

**The fix, as a safety net:** in `before-quit`, the app now also reads the clock's current position and size and saves them. I also made `SIGINT` and `SIGTERM` call `app.quit()`. Without that, pressing `Ctrl+C` in the terminal would kill the app without running `before-quit`, and nothing would be saved. I tested both signals: the position survived a restart each time.

**Lesson:** when a test has to fake an event, say so, and add a second line of defence for the thing the test could not prove.

## 8b: The settings window

**What I built:** a ⚙ button on the clock that opens a second window (`settings.html`) with an opacity slider, a size slider, and four corner buttons.

### Decisions

- **One settings window only.** If it is already open, clicking ⚙ again just brings it forward.
- **A normal window, not a panel.** It has a title bar and closes normally. Closing it leaves the clock running.
- **It follows the clock into full-screen Spaces.** It uses the same `setVisibleOnAllWorkspaces` call as the clock, and sits at the "floating" level, so it does not open hidden behind the app I opened it from. I could not test this over a real full-screen app.
- **`app.focus({ steal: true })`.** The app has no Dock icon, so macOS does not treat it as the active app. Without this, the settings window could appear without being able to take focus.
- **The ⚙ is placed in the top-right corner, absolutely positioned**, because the button row was already full (see Step 7's cramped-row hiccup). It sits above the time, so it cannot collide with it. I checked it against the display and the buttons at 66, 220, and 490 px in every mode.
- **Corner buttons.** The main process works out the corner position for the screen the clock is on (`screen.getDisplayMatching`), using a shared `cornerPosition` helper that startup also uses.
- **Growing near an edge.** When the size slider makes the clock bigger, `fitInsideScreen` slides it back on screen if it would stick out. This fixes the Step 7 caveat for the slider. Dragging the edge by hand does not do it.
- **The settings page and the clock page stay in sync.** Dragging the clock's edge moves the slider, and clicking the ◐ button moves the opacity slider, because both listen for the broadcast.

### Naming clash

`settings.js` was already the storage file used by the main process. The settings *page* needed its own script, so I called it `settings-page.js` (and `settings-page.css`) to avoid confusion.

### How I tested it

I opened the settings window by clicking the real ⚙ and drove its sliders and buttons from a script. Checks included: only one window opens, the sliders change the clock's real opacity and size, the corner buttons put it in each corner, an unknown corner name is ignored, a 490 px clock near the right edge is nudged on screen, and the settings sliders follow the clock when it changes. I also looked at the rendered images.

## 8c: Colors, font, time format, timer length, and reset

### New settings

| Setting | Control | How it is applied |
|---|---|---|
| Background color | color picker | CSS variable `--background` |
| Text color | color picker | CSS variable `--text` |
| Font | dropdown of 6 | CSS variable `--font` |
| 12-hour time | checkbox | the clock shows `3:59:16 PM` |
| Timer length | number, 1 to 99 | the starting duration of the countdown |
| Reset | button | back to defaults, size, and top-right corner |

### Security thinking: nothing arbitrary becomes CSS

Colors and fonts end up in the page's CSS, so a bad value could be an injection (for example `#000; background:url(http://evil)`).

- **Colors** must match `^#[0-9a-fA-F]{6}$`, a plain `#rrggbb`, and nothing else is accepted.
- **Fonts** are not stored as text. The file stores a short key such as `"mono"`, and only keys in the `FONT_OPTIONS` list are accepted.
- **One list, one place.** The list (with labels and CSS stacks) lives in `settings.js`. The main process sends it to both windows, so the dropdown and the clock cannot disagree.
- I tested 12 bad colors (including injection attempts and a `</style><script>` string), 8 bad fonts (including `__proto__` and `constructor`), and a hand-edited settings file with bad fields.

### Buttons that work with any color

The buttons used to be fixed dark greys, which would look wrong on a light background. They are now a see-through grey (`rgba(128,128,128,0.25)`) and use the text color (`color: inherit`), so they adapt to whatever colors I choose. I checked the result on a cream background with a dark teal text and Georgia.

### 12-hour time

- 0 and 12 o'clock both show as 12 (`hours % 12 || 12`).
- AM/PM is a smaller, dimmer `<span>` after the time.
- The digits shrink slightly in 12-hour mode so the longer text fits. I checked it fits at 66, 220, and 490 px and does not touch the ⚙.
- The clock now only writes to the page when the text really changes, not ten times a second.

### A bug I avoided: moving the clock must not undo the timer

The page re-applies all settings every time the main process broadcasts them, and the main process broadcasts whenever the clock is moved or resized. If the page set the timer length from settings on every broadcast, then dragging the clock would reset my `+` and `−` adjustments. I fixed this by remembering the last timer-length value seen, and only changing the timer when that setting itself changes. I tested it: set 40, press `+` (41:00), resize the clock, and it stays 41:00. The length also does not disturb a countdown that is running.

### Reset

Reset asks for confirmation (`confirm()`), then restores every default and puts the clock back at 220×110 in the top-right corner of the main screen. I checked that the clock and every control in the settings window update.

## Hiccups in this step

### The settings window was too short for its content

My test checked `scrollHeight <= innerHeight` and failed: the content was 700 px tall, and the window's view was only 632 px. Without the check, the Reset button would have been cut off. I reduced the spacing (body padding 20 to 16 px, section gaps 22 to 16 px) and made the window 700 px tall. Content now fits exactly (672 of 672) and the window fits on screen (700 of 805).

### Test-tool problems (not app bugs)

- `executeJavaScript` returns the value of the last expression. My test line `window.confirm = () => true` returned a function, which cannot be copied back to the test, so the test hung. The fix was to wrap it in a function that returns nothing.
- The macOS shell has no `timeout` command, so I could not put a time limit on the test run.
- An older test compared the whole settings object to four fields, which failed once I added more settings. That was the test being too strict, so I changed the test, not the code.

## What I have not verified

- **Opening the settings window over a full-screen app.** I set it up the same way as the clock, but I could not test it.
- **The ⚙ button with a real mouse**, and the native color picker. I set colors from code.
- **A real drag firing "moved".** The quit-time save covers it, but I did not see the event fire.
- **Dragging the clock's edge near the screen edge** is not nudged back on screen. Only the size slider does that.

## Lessons

1. **Keep logic out of the framework.** A settings store with no Electron imports could be tested in plain Node in a few seconds.
2. **Validate on the way in and on the way out.** Both the file and the page are untrusted. A bad value should never replace a good one.
3. **If a test fakes something, add a safety net for what it could not prove.** The quit-time save covers the unproven "moved" event.
4. **One source of truth.** The font list, the defaults, and the limits each exist in one place, and everything else reads them.
5. **A broadcast reaches everything, including things that should not react.** Moving the clock must not reset the timer, so the page only reacts when the specific value changes.
6. **Check the real fit.** A scroll-height check caught a settings window that cut off its own Reset button.

## What is next

Step 9 is polish: an alert when the countdown reaches zero, and UI details. Step 6 (click-through and hotkeys) is still postponed. When I return to it, hotkeys can also get controls in this settings window.
