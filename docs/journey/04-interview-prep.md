# 04: Interview prep

The project told as a story, followed by likely questions and answers. Everything here is based on what actually happened in steps 1 to 5, 7, and 8 (step 6 is postponed). Update it as the project grows.

## The 30-second pitch

"I get distracted while working, so I'm building a small always-on-top clock, timer, and stopwatch for macOS. It floats in the corner of the screen and stays visible over every app, even full-screen YouTube. I built it with Electron. Before choosing it, I compared a Chrome extension, Picture-in-Picture, Swift, and Tauri, and I tested the riskiest requirement, showing over full-screen apps, early, before building the rest."

## The two-minute version

1. **Problem:** I lose focus, and I wanted constant, glanceable time on screen.
2. **Research:** a website or extension cannot leave the browser. Chrome's Document Picture-in-Picture comes close but has no click-through, a minimum size, and no control over position.
3. **Decision:** Electron, because I already know web technologies and it exposes all the window controls I need. The fallback was native Swift.
4. **Process:** ten small steps, tested one at a time, committed after each. The riskiest one (full-screen overlay) came early.
5. **Challenges:** a silent install failure, an environment variable that made Electron run as plain Node, and macOS Spaces blocking the window from full-screen apps.
6. **Result:** a corner clock that stays on top of everything, including full-screen apps, with a clock, a countdown timer, and a stopwatch (start, pause, reset, and mode switching). It can be resized from fingernail-size to about four inches, with adjustable opacity. A settings window customizes colors, font, 12/24-hour time, and timer length, and everything is remembered between launches. Click-through and hotkeys are next.

## Likely questions

### Why Electron and not a website or extension?

A web page can only draw inside the browser. My core requirement was to stay visible over other apps, plus click-through and global hotkeys, which a web page cannot do. Electron gives a web page its own native window that my code controls.

### What is Electron?

A framework for building desktop apps with HTML, CSS, and JavaScript. It bundles the Chromium browser engine and Node.js, so the app is a web page in its own window. VS Code, Slack, and Discord use it.

### What are the main process and the renderer?

The main process runs in Node, creates windows, and controls window behaviour: position, always-on-top, click-through, global hotkeys. There is one per app. The renderer is the web page inside a window, running the UI and timer logic. They communicate by messages (IPC), which I will use for the settings window.

### What are the downsides of Electron?

Memory use, because every app carries a browser engine (roughly 100 MB or more), and larger download size (about 121 MB for the Electron binary, around 272 MB in `node_modules`). For a clock I would have chosen native Swift if memory mattered. I kept Swift as my fallback.

### Why did you test the full-screen requirement so early?

It was the one requirement that could have invalidated the whole technology choice. Finding out at step 4 costs a few hours. Finding out at step 10 would cost the project. Do the riskiest thing first.

### How did a window stay above full-screen apps?

On macOS, a full-screen app has its own Space, and a normal always-on-top window is not allowed in it. Four things together fixed it:

- `type: "panel"`: a lightweight, non-activating window type;
- `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`: present in every Space, including full-screen ones;
- `setAlwaysOnTop(true, "screen-saver")`: a very high window level;
- `app.dock.hide()`: only background-style apps may draw over full-screen apps.

I did not isolate which of these four was strictly necessary. I applied the recommended combination and tested the result.

### Describe a bug you debugged.

**The `whenReady` crash.** The error was `Cannot read properties of undefined (reading 'whenReady')`. That meant `require("electron")` returned `undefined`, which happens when Electron runs a script as plain Node. The log ended with a Node.js version line, which a real Electron run would not print. I checked the environment and found `ELECTRON_RUN_AS_NODE=1` set. Unsetting it fixed it. The lesson: when a framework's own entry point is undefined, look at how the program is launched before the code.

**The silent install.** `pnpm add -D electron` finished in under two seconds. A roughly 121 MB download cannot do that. I checked `node_modules/electron/dist`, found it missing, and traced it to pnpm blocking install scripts by default. I ran the script manually, and approved it in `pnpm-workspace.yaml`.

### How did you test things you could not see?

macOS blocked screenshots of the app window because the capturing process lacked Screen Recording permission. I wrote a throwaway script that loaded the page in a hidden window and read the displayed time twice, 2 seconds apart, then compared it to the system clock. That verified the logic. I was explicit that the visual look and the full-screen behaviour still needed me to check them by eye, and I did.

### Why check the time several times a second?

A one-second `setInterval` drifts and can skip a displayed second. I started by checking every 250 ms, which keeps the display at most 250 ms behind. In Step 5 I moved to 100 ms so the stopwatch's tenths of a second update smoothly. One shared loop updates the clock, timer, and stopwatch.

### How did you build an accurate countdown timer?

I did not subtract a second on every tick. `setInterval` is not exact, so a late tick would make the timer fall behind real time. Instead I store the moment the countdown will reach zero (`endTime = Date.now() + duration`) and compute `endTime - Date.now()` on every tick. The display is correct however late a tick is. The stopwatch works the same way with a start time.

### How did you test a 25-minute timer?

I did not wait. A test script clicked the buttons in the real app, then overrode `Date.now` in the page to jump 25 minutes ahead and checked that the display read `00:00` in red and the buttons unlocked. That only works because the timer reads `Date.now()` each time. A tick-counting design could not be tested that way.

### How do pause and resume work?

On pause I save the time left (`endTime - Date.now()`) and clear `endTime`. On resume I set a new `endTime` from the saved value. The stopwatch banks the finished run into `elapsedBeforeMs` and clears its `startTime`. I tested that a paused display stays frozen (`24:58` stayed `24:58` for 1.5 seconds).

### How did you structure the timer's logic?

As four named states: idle, running, paused, and finished. Each button's behaviour follows from the state: reset is disabled when idle, plus and minus only work when idle or finished, and pressing play when finished restarts from the full duration. Naming the states replaced a tangle of special cases.

### What happens to the timer when you switch modes?

It keeps running. Switching mode only hides and shows elements (using a `data-mode` attribute and the `hidden` attribute). The timer and stopwatch state live separately from the display, and one loop keeps updating everything. I tested it by starting both, switching to the clock and back, and checking they had advanced.

### Why do the buttons have `-webkit-app-region: no-drag`?

The whole window is a drag handle, because a frameless window has no title bar to drag. Without `no-drag`, clicking a button would start dragging the window instead of pressing the button.

### What is a Content-Security-Policy and why did you add one?

It is a rule, set in a `<meta>` tag, that tells the page which sources it may load scripts and styles from. Mine allows only the app's own files. Electron warns about pages without one, and it reduces the damage if untrusted content ever reached the page. A consequence is no inline scripts or styles, so my JS and CSS are separate files.

### What does `workArea` do?

It is the screen's usable area, excluding the menu bar and Dock. I position the clock relative to it so it sits in the corner without being hidden.

### What is the difference between `git push --force` and `--force-with-lease`?

Both overwrite remote history. `--force-with-lease` first checks that the remote still has the commit I expect, so it will not overwrite work someone else pushed in the meantime. I used it after amending a commit to remove an unwanted co-author line, on a repo where I was the only contributor.

### What would you do differently?

- Commit each step as soon as it works. I once had two steps tangled in one file and had to separate them by hand.
- Check that an install actually produced what it should, instead of trusting a fast "Done".
- Write the interview and journey notes as I go, not afterwards.

### How does the whole clock scale when the window is resized?

I wrote every size in `rem` and set the root font size from the window width: `html { font-size: calc(100vw / 22); }`. When the window grows, the root font grows, and everything in `rem` (text, buttons, gaps, padding) grows by the same proportion. I also locked the window to a 2:1 shape with `setAspectRatio`, so the height always follows the width and the content always fits. I checked the layout at 66, 220, and 490 px wide in all three modes.

### How does the page talk to the main process?

Through IPC. The page calls `window.timeTrackerApp.setOpacity(...)`. A preload script exposes that one function with `contextBridge.exposeInMainWorld`, and it forwards the call with `ipcRenderer.invoke`. In `main.js`, `ipcMain.handle` receives it and changes the window. The page cannot call anything else.

### Why a preload script and `contextBridge` instead of giving the page Node access?

Web content should not get full Node access. If untrusted code ever ran in the page, it could use the computer. Context isolation keeps the page separate from Electron's internals, and the preload script (which runs first, with limited access) hands the page only the functions I choose. I checked it from inside the page: `require` is undefined, and the raw `ipcRenderer` is not reachable.

### What do you do with data that arrives over IPC?

I do not trust it, even though it comes from my own page. The handler ignores anything that is not a real number, and clamps numbers to 0.1 to 1, so the window cannot be made invisible. I tested with strings, `NaN`, `null`, `undefined`, an object, and out-of-range numbers.

### Why use `setOpacity` instead of CSS `opacity`?

The window itself is not transparent. Its background is a solid rectangle, so CSS opacity would only fade the content against that background, and the desktop would not show through. `win.setOpacity()` changes the whole window, and only the main process can call it, which is why IPC is needed.

### How did you check what the UI looked like if you could not see the screen?

Early on, `screencapture` returned only the wallpaper, because macOS blocks capturing other apps' windows without Screen Recording permission. Later I used `webContents.capturePage()`, which asks the page for its own pixels, needing no permission. I saved the render to a PNG and looked at it. That caught a problem a numeric check had passed: the new opacity button was taller than its neighbours, and the row had only 5px to spare. I fixed it with a fixed button height.

### How do you save and load settings safely?

A small store module holds the defaults and one validator per setting. Each validator returns a clean value or `undefined`. When a value comes in (from the file, or from the page), only the usable fields replace the current ones, so a bad value never overwrites a good one. Saving is debounced by 300 ms, because dragging a window changes its position many times a second. It writes to a temporary file and renames it, so a crash can never leave a half-written file. A missing, corrupt, or hand-edited file falls back to defaults, field by field.

### Why does the settings store not use Electron?

So it can be tested with plain Node, in seconds, with no window. It only uses `fs` and `path`, and it takes the file path as an argument. I wrote 37 checks for it, including corrupt files, prototype-pollution keys, and injection strings, before it was connected to the app.

### How do colors and fonts get into the page without being a security risk?

Nothing arbitrary becomes CSS. A color must match `^#[0-9a-fA-F]{6}$`. A font is not stored as text: the file stores a short key like `"mono"`, and only keys in a fixed list are accepted. The CSS font stack comes from that list. I tested injection strings like `#000; background:url(http://evil)` and `</style><script>`, and they were all rejected.

### How do several windows stay in sync?

The main process owns the settings. Any window asks it to change something (`settings:update`). It validates, applies the change to the clock window, saves, and then broadcasts the new settings to every window. So dragging the clock's edge moves the slider in the settings window, and the ◐ button moves the opacity slider.

### What bug did a broadcast almost cause?

The page re-applies all the settings on every broadcast, and the main process broadcasts whenever the clock is moved or resized. If the page set the timer length from settings each time, moving the clock would reset my `+` and `−` adjustments. I made the page remember the last timer length it saw and only react when that value really changes. I tested it: 41:00 stays 41:00 after resizing the clock.

### What if the saved position is on a monitor that is gone?

At startup I check whether any part of the saved rectangle is on a connected screen (`screen.getAllDisplays()`). If not, the clock goes to the top-right corner of the main screen. I tested this with a position of 99999, 99999.

### What was a test that caught a real bug in this step?

The settings window's content was 700 px tall in a window whose view was 632 px, so the Reset button would have been cut off. A check that compares `scrollHeight` to `innerHeight` failed. I tightened the spacing and made the window taller, and it now fits exactly.

### What does it mean when a test has to fake an event?

My test moved the window with `setBounds()`, which does not fire "moved" or "resized" (those fire for real user drags). I had to emit them by hand, which meant I had not proved the real events fire. So I added a safety net: the app also saves the clock's position when it quits, and I made `Ctrl+C` quit properly so that save still runs. I tested both kill signals. The lesson is to be open about what a test did not prove, and to cover it.

### Why `app.focus({ steal: true })` for the settings window?

The app hides its Dock icon so it can sit over full-screen apps, which means macOS does not treat it as the active app. Without that call, the settings window could appear but not take focus.

### Why did you rename the project, and what did that involve?

"Clock" is a plain name, and macOS already has a built-in Clock app, so the two would be confusing and hard to find. I renamed it to Time Tracker. The product name appears in many places: the app and bundle name, the bundle ID, `package.json` (`name` and `productName`), the window titles, the build folder and zip file, the settings folder (Electron derives it from the product name), the internal names, my local tooling, the docs, and the repository. I did a search for exact names, then read the leftover mentions to avoid renaming things that only use the ordinary word, like the "Clock" mode of the clock/timer/stopwatch switch. I did not launch the app afterwards. I checked the code's syntax, searched for the old internal names, and read the new build's `Info.plist`. I also had to leave two steps for myself: renaming the GitHub repo, and the folder I was working in.

### Why does `package.json` have both `name` and `productName`?

`name` is the package's machine name: lowercase with a hyphen (`time-tracker`), the form tools expect. `productName` is the name people see (`Time Tracker`). Electron uses `productName` for the app's display name and for the folder where it saves settings.

### Why is the zip named with hyphens when the app has a space in its name?

The zip becomes a download link and a line in a Homebrew cask file, and spaces in links cause bugs. So the app is `Time Tracker.app` but the file is `Time-Tracker-0.1.0-arm64.zip`.

### Why did you skip Step 6 and do Step 7 first?

Resizing and opacity did not depend on click-through or hotkeys, so the order was a free choice. I will come back to Step 6.

### What is next, and what is hard about it?

Step 6 (click-through and hotkeys) is postponed on purpose. Click-through conflicts with things I have already built. If the window ignores mouse events, I cannot drag it, I cannot drag its edges to resize it, and I cannot press its buttons (mode, start, pause, reset, opacity, or the settings gear). Hotkeys will also get controls in the settings window. My plan is a hotkey that toggles click-through off so I can move it and use the buttons, then on again, plus hotkeys for start/pause and switching modes so I rarely need to turn click-through off.

## Things I should be honest about

- I used an AI assistant to guide me and write code step by step. I tested each step myself and can explain every file.
- The cause of the `NSWindow does not support nonactivating panel styleMask 0x80` warning is my understanding (Electron applies the non-activating flag and macOS complains), and I did not dig into Electron's source to confirm it. It is harmless in practice.
- The full-screen behaviour was verified by hand, not by an automated test.
- For Step 8, I tested the settings with scripts that drove the real settings window, and looked at rendered images. I had not yet clicked the gear with a real mouse, tried the native color picker, opened settings over a full-screen app, or seen a real drag fire the "moved" event (the app also saves on quit to cover that).
- For Step 7, I tested the size limits and the opacity cycle from code, and looked at rendered images. I had not yet grabbed the window edge with a real mouse. Size and opacity are not remembered between launches, and I made the largest size four inches wide, which is two inches tall, because of the 2:1 shape.
- For Step 5, I tested the timer and stopwatch logic and the layout sizes with scripts that clicked the buttons in code and faked the time. I had not yet checked how it looks, or clicked the buttons with a real mouse while another app was in front.

## Quick facts

| Fact | Value |
|---|---|
| Electron version | 45.0.0 |
| Platform | macOS (Apple Silicon) |
| Package manager | pnpm |
| Electron binary download | about 121 MB |
| `node_modules` size | about 272 MB |
| Window size | 220 × 110 by default; 66 × 33 to 490 × 245 when resized (always 2:1) |
| Opacity levels | 100%, 80%, 60%, 40%, 20% (the main process never goes below 10%) |
| Refresh loop | every 100 ms |
| Timer range | 1 to 99 minutes, default 25 (changeable in settings) |
| Settings file | `~/Library/Application Support/Time Tracker/settings.json`, saved 300 ms after the last change |
| Font choices | 6: System, Helvetica Neue, Avenir Next, Futura, Georgia, Menlo |
| Settings checks | 37 plain-Node checks for the store, plus scripted tests of the real windows |
