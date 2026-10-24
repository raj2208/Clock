# 04: Interview prep

The project told as a story, followed by likely questions and answers. Everything here is based on what actually happened in steps 1 to 4. Update it as the project grows.

## The 30-second pitch

"I get distracted while working, so I'm building a small always-on-top clock, timer, and stopwatch for macOS. It floats in the corner of the screen and stays visible over every app, even full-screen YouTube. I built it with Electron. Before choosing it, I compared a Chrome extension, Picture-in-Picture, Swift, and Tauri, and I tested the riskiest requirement, showing over full-screen apps, early, before building the rest."

## The two-minute version

1. **Problem:** I lose focus, and I wanted constant, glanceable time on screen.
2. **Research:** a website or extension cannot leave the browser. Chrome's Document Picture-in-Picture comes close but has no click-through, a minimum size, and no control over position.
3. **Decision:** Electron, because I already know web technologies and it exposes all the window controls I need. The fallback was native Swift.
4. **Process:** ten small steps, tested one at a time, committed after each. The riskiest one (full-screen overlay) came early.
5. **Challenges:** a silent install failure, an environment variable that made Electron run as plain Node, and macOS Spaces blocking the window from full-screen apps.
6. **Result:** a corner clock that stays on top of everything, including full-screen apps. Timer, stopwatch, click-through, hotkeys, and a settings window are next.

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

### Why check the time four times a second?

A one-second `setInterval` drifts and can skip a displayed second. Checking every 250 ms keeps the display at most 250 ms behind.

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

### What is next, and what is hard about it?

Step 5 is the countdown, stopwatch, and mode switching. The hard part is Step 6: click-through and dragging conflict. If the window ignores mouse events, I cannot drag or resize it. My plan is a hotkey that toggles click-through off so I can move it, then on again.

## Things I should be honest about

- I used an AI assistant to guide me and write code step by step. I tested each step myself and can explain every file.
- The cause of the `NSWindow does not support nonactivating panel styleMask 0x80` warning is my understanding (Electron applies the non-activating flag and macOS complains), and I did not dig into Electron's source to confirm it. It is harmless in practice.
- The full-screen behaviour was verified by hand, not by an automated test.

## Quick facts

| Fact | Value |
|---|---|
| Electron version | 45.0.0 |
| Platform | macOS (Apple Silicon) |
| Package manager | pnpm |
| Electron binary download | about 121 MB |
| `node_modules` size | about 272 MB |
| Window size | 220 × 80 |
| Time refresh | every 250 ms |
