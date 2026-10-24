# 02: Building steps 1 to 4

For each step: what I built, how I tested it, and what went wrong.

## Step 1: Hello window

**Goal:** prove the Electron setup works by opening a plain window that says "Hello".

**Files created:**

- `package.json`: names the project and has one script, `"start": "electron ."`.
- `main.js`: creates a `BrowserWindow` and loads `index.html`.
- `index.html`: just `<h1>Hello</h1>`.

**Key code in `main.js`:**

```js
app.whenReady().then(() => {
  createWindow();
});
```

`app.whenReady()` waits until Electron has finished starting up. Creating a window before that fails.

### Hiccup 1: pnpm installed Electron but did not download it

I ran `pnpm add -D electron` and it finished in under two seconds. That is far too fast for a roughly 121 MB download.

**What was happening:** the `electron` package on npm is tiny. It contains an install script that downloads the real Electron app (the browser engine, about 121 MB) from GitHub. Newer pnpm versions block install scripts by default, for security. So the script never ran, and there was no Electron app on disk.

**How I found it:** `node_modules/electron/dist` did not exist, and neither did `path.txt`, which is the file the install script writes.

**The fix:**

- pnpm had already written `allowBuilds: electron: true` into `pnpm-workspace.yaml`, so the approval was recorded, but the script still had not run.
- I ran the install script by hand: `node node_modules/electron/install.js`. That downloaded the binary, and `node_modules` grew to 272 MB.
- `pnpm-workspace.yaml` stays committed so a fresh `pnpm install` works.

**Lesson:** a very fast install of something large means something was skipped. Verify that the thing actually exists on disk.

### Hiccup 2: "Cannot read properties of undefined (reading 'whenReady')"

The first launch crashed with:

```
TypeError: Cannot read properties of undefined (reading 'whenReady')
...
Node.js v24.22.0
```

**What it meant:** `require("electron")` returned `undefined`. That happens when Electron runs my script as plain Node.js, not as an Electron app. The `Node.js v24.22.0` line at the bottom was the clue, because a real Electron run does not print that.

**The cause:** an environment variable, `ELECTRON_RUN_AS_NODE=1`, was set in the shell the assistant was using. (That tool is itself built on Electron.) The variable tells Electron to behave as plain Node.

**The fix:** run with the variable removed: `env -u ELECTRON_RUN_AS_NODE pnpm start`. It did not affect my own terminal, where `pnpm start` worked normally.

**Lesson:** if a framework's own entry point is `undefined`, suspect how the program is being launched before suspecting the code.

## Step 2: Live ticking time

**Goal:** show the current time, updating every second.

**Files:** `index.html` (a `<div id="time">`), `style.css`, and a new `renderer.js`.

**Key code in `renderer.js`:**

```js
function updateTime() {
  const now = new Date();
  timeElement.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
updateTime();
setInterval(updateTime, 250);
```

### Design decisions

- **Why check 4 times a second instead of once?** A `setInterval` of 1000 ms drifts. Over time it can land just before and then just after a second boundary, which makes the display skip a second. Checking every 250 ms means the displayed second is never more than 250 ms stale.
- **Why `font-variant-numeric: tabular-nums`?** In most fonts, `1` is narrower than `0`, so the text would wobble sideways as digits change. Tabular numbers give every digit the same width.
- **Why a Content-Security-Policy `<meta>` tag?** Electron prints a security warning for pages without one. The policy `default-src 'self'; script-src 'self'; style-src 'self'` says the page may only run scripts and styles from its own files. That also meant no inline `<script>` or `<style>`, which is why the JS and CSS are separate files.

### Hiccup 3: I could not see the window to test it

I tried `screencapture` to see the window. The screenshot showed only the desktop wallpaper and Electron's menu bar. The window was missing.

**Why:** macOS hides other apps' windows from screenshots unless the capturing process has Screen Recording permission.

**How I tested instead:** a small throwaway script that loaded the page in a hidden Electron window, read the text of the time element twice, 2 seconds apart, and compared it to the system clock. The results were `14:06:58`, then `14:07:00`, against a system clock of `14:07:01`, and the CSS was applied (font-size `64px`). That proved the logic. The look I checked myself by running `pnpm start`.

**Lesson:** when you cannot observe something directly, test the logic separately. And be honest about what was not verified.

## Step 3: Frameless, always-on-top corner clock

**Goal:** make the window a floating clock in the top-right corner.

**Changes in `main.js`:**

```js
const { x, y, width } = screen.getPrimaryDisplay().workArea;

const win = new BrowserWindow({
  width: WIDTH,
  height: HEIGHT,
  x: x + width - WIDTH - MARGIN,
  y: y + MARGIN,
  frame: false,
  alwaysOnTop: true,
  resizable: false,
});
```

- `frame: false` removes the title bar and window buttons.
- `alwaysOnTop: true` keeps the window above other apps' windows.
- `workArea` is the screen minus the menu bar and Dock. Using it instead of the full screen size means the clock lands in the corner without hiding under the menu bar.
- `WIDTH`, `HEIGHT`, and `MARGIN` are constants at the top so they are easy to change.

**Side effect of `frame: false`:** with no title bar, there is nothing to drag. I added `-webkit-app-region: drag` to the CSS, which makes the whole window a drag handle. (This will conflict with click-through in Step 6, so it will need a better solution.)

**Quitting:** with no close button, I quit with `Cmd+Q` or `Ctrl+C` in the terminal.

**The test that showed the problem:** I switched to a full-screen app and the clock disappeared.

## Step 4: Visible over full-screen apps (the risky step)

**Why it failed after Step 3:** on macOS, a full-screen app gets its own Space (its own desktop). An ordinary always-on-top window belongs to the normal desktop Space, so it is not allowed into that one.

**Why this was the riskiest requirement:** it was the one thing that could have forced me to abandon Electron. I put it at Step 4 on purpose.

**The fix: three settings in `main.js`:**

```js
type: "panel",
// ...
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
win.setAlwaysOnTop(true, "screen-saver");
// and before creating the window:
app.dock.hide();
```

| Setting | What it does |
|---|---|
| `type: "panel"` | Makes it a lightweight macOS panel (like Spotlight), which is allowed to appear over full-screen apps and does not steal focus from them. |
| `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` | Makes the window appear in every Space, including a full-screen app's own Space. |
| `setAlwaysOnTop(true, "screen-saver")` | Puts the window on one of the highest window levels, above ordinary floating windows. |
| `app.dock.hide()` | Hides the Dock icon. macOS only lets "background" apps draw over full-screen apps. |

**Result:** it worked. The clock stays visible over full-screen Chrome and YouTube.

### Hiccup 4: a scary-looking warning that is harmless

Every launch prints:

```
NSWindow does not support nonactivating panel styleMask 0x80
```

**What it is:** `0x80` is macOS's "non-activating panel" flag, meaning "this window should not steal focus". Electron applies it because of `type: "panel"`, and macOS complains that the window is not technically a panel. The window still behaves correctly.

**What I did:** nothing. I could not silence it without removing `type: "panel"`, which risks breaking the full-screen behaviour. I confirmed it was harmless because the feature worked.

**Lesson:** not every warning is a bug. Check whether the behaviour you care about works, and know why the message appears before deciding to ignore it.

### Side effects to remember

- No Dock icon (intended).
- `Cmd+Q` may not work, because the clock no longer takes focus. Quit with `Ctrl+C` in the terminal until Step 6 adds a quit hotkey.

## What I learned in these four steps

- The main process controls the window; the renderer draws what is inside it.
- Always-on-top is not one setting. Staying above normal windows, staying above full-screen apps, and appearing in every Space are three separate things on macOS.
- Test the risky part first.
- Verify installs and environments before blaming the code.
