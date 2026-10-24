# Roadmap

How we will build the clock, step by step. Each step is small, gets run and looked at before moving on, and is committed to GitHub when it works. The goal is to learn Electron along the way without rushing.

## How Electron development works

It is close to normal website development. The difference is that `pnpm start` opens a desktop window instead of a `localhost` URL.

| Website | Electron |
|---|---|
| Write HTML/CSS/JS in VS Code | Same |
| `pnpm dev` starts a server and I open `localhost:3000` | `pnpm start` opens a real window on the screen |
| Save the file and the page hot-reloads | Manual reload at first: `Cmd+R` in the window, or restart. Auto-reload can be added later |
| DevTools in Chrome | DevTools inside the app window |

There is no server and no `localhost`. Electron loads `index.html` straight from disk into its own window.

### The two halves

1. **Main process (`main.js`)** runs in Node. It creates windows and controls window behaviour: always on top, click-through, hotkeys. There is one per app.
2. **Renderer (`index.html`, CSS, JS)** is the web page inside the window. It draws the clock and runs the timer logic.

The two halves talk to each other through messages (for example, the settings window tells the clock window to change opacity). This only matters when the settings window is built.

### Project files

- `package.json`: project name, dependencies, and scripts (`pnpm start` launches Electron).
- `main.js`: the main process.
- `index.html`, CSS, JS: the clock window.
- Later: a second page for the settings window.

### How it becomes a real app

During development the app is only run with `pnpm start`. At the end, a packaging tool (Electron Forge or electron-builder) bundles it into a real `Clock.app` that can be dragged into Applications and launched at login. Code signing is not needed for a personal app.

### Setup notes

- Already installed: Node 25, pnpm 12, macOS 14 on Apple Silicon.
- Electron download is about 121 MB (Electron 45, macOS arm64), and about 250-300 MB unpacked in `node_modules`.
- pnpm blocks install scripts by default, so Electron's install script must be approved (`onlyBuiltDependencies`) or it will install but not run.
- `node_modules/` goes in `.gitignore`.
- `console.log` in `main.js` prints in the terminal. In the renderer it prints in the app's DevTools.
- Closing the window may not quit the app on macOS: use `Cmd+Q`, or `Ctrl+C` in the terminal.

## The steps

### Step 1: Hello window (done)
Install Electron and open a plain window that says "Hello". Proves the setup works.
**Test:** `pnpm start` opens a window.

### Step 2: Live time (done)
Show the current time in that window, updating every second.
**Test:** the time ticks.

### Step 3: Floating clock (done)
Make the window frameless (no title bar), always on top, and placed in the top-right corner.
**Test:** it stays on top while I switch to Chrome and other apps.

### Step 4: Full-screen test (risky step) (done)
Check that the clock stays visible over a full-screen Chrome window and a full-screen YouTube video, including on other desktops (Spaces).
**Test:** open YouTube full screen and see the clock. If this proves unreliable in Electron, the fallback is Swift/SwiftUI (see `comparison.md`). We find this out early on purpose.

### Step 5: Countdown, stopwatch, and modes (done)
Add the countdown timer and the stopwatch, then a way to switch between clock, timer, and stopwatch.
**Test:** each mode works, and start/pause/reset behave.

### Step 6: Click-through and hotkeys (postponed)
Make the window click-through so it never blocks what is underneath. Add a global hotkey that turns click-through off (so I can drag or resize the clock) and back on. Add hotkeys for mode switching and start/pause.
**Test:** clicks pass through the clock, and the hotkey lets me move it.

### Step 7: Resize and opacity (done)
Make it resizable from fingernail-sized up to roughly a four-inch square, with adjustable opacity.
**Test:** extremes of size and opacity look right and stay readable.

### Step 8: Settings window (done)
A separate window to customize everything: size, opacity, colors, fonts, position, and hotkeys (hotkeys wait for Step 6). Settings are saved so they persist after quitting.
**Test:** change a setting and the clock updates live; restart and it is remembered.

### Step 9: Polish
Colors, fonts, an alert (sound or color change) when the countdown reaches zero, and other UI details.

### Step 10: Package as a real app (in progress)
Bundle into `Clock.app`, add it to Applications, and optionally launch at login. Built as sub-steps:
- **10a:** package the app into `Clock.app` with one command (`pnpm package`).
- **10b:** give it a proper icon.
- **10c:** make a zip of the app, with its checksum, ready to publish.

**Test:** open the app without the terminal.

### Step 11: Publish a GitHub Release
Upload the zipped `Clock.app` to a GitHub Release (for example `v0.1.0`) on the Clock repo, so it has a stable download link.
**Test:** the link downloads the zip, and the checksum matches.

### Step 12: Install with Homebrew
Make the app installable with one command, through my own Homebrew tap (a second GitHub repo named `homebrew-clock`):
- A cask file, `Casks/clock.rb`, holds the version, the download link, the checksum, and `app "Clock.app"`.
- It can also say what to delete on uninstall (the settings folder).
- People then install it with `brew install --cask raj2208/clock/clock`.

**Test:** on my own Mac, run `brew install`, open the app, then `brew uninstall`.

### Step 13: Signing and notarization (optional)
Without it, macOS warns people who download the app on their own Mac, and they have to right-click and choose Open. Signing and notarizing with an Apple Developer account (about $99 a year) removes the warning, and would be needed to get into the official Homebrew cask list. Decide on this only if other people will use the app. Check Apple's and Homebrew's current rules first.

### Later ideas
- Release a universal build (Apple Silicon and Intel) instead of Apple Silicon only.
- Automate new releases, and the version and checksum update in the cask.
- Step 6 (click-through and hotkeys) is still postponed.

## Working rules

- One step at a time, with no rushing.
- Run and look at each step before moving on.
- Commit and push to GitHub after each working step, using the clock-git-push skill.
- Update `context.md` when a requirement or decision changes.
