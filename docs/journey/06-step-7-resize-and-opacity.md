# 06: Step 7, resize and opacity

**Goal:** let the clock be resized from fingernail-small to about four inches, and let its transparency be adjusted.

**Order of work:** I chose to skip Step 6 (click-through and hotkeys) for now and do Step 7 first. Step 6 is postponed, not dropped. I built this step as two sub-steps and committed each one.

| Sub-step | Commit | Commit message |
|---|---|---|
| 7a | `219f733` | make the clock resizable with scaling content |
| 7b | `fe99ff1` | add opacity button using a safe preload bridge |

## 7a: Resizing

### The problem

Making a window resizable is one line (`resizable: true`). The real problem is the content. At a fixed 40px font size, the time would overflow a small window and look lost in a big one. The whole clock has to scale.

### Solution: size everything in `rem`, and tie `rem` to the window width

```css
html {
  font-size: calc(100vw / 22);
}
```

- `rem` is a CSS unit equal to the page's root font size.
- `100vw` is the window's width, so the root font size is always 1/22 of it.
- Every size in the stylesheet (display text, button text, gaps, padding, corner radius) is written in `rem`.

So when the window gets wider, the root font grows, and everything grows with it in the same proportion. At the default 220px width, 1rem is 10px, so the old pixel values became simple numbers (40px became `4rem`, 13px became `1.3rem`).

### Keeping the shape: a locked 2:1 aspect ratio

Because everything scales with width, the height must follow the width, or the content would not fit. Electron can enforce that:

```js
win.setAspectRatio(WIDTH / HEIGHT);
```

When I drag a corner, the window keeps its 2:1 shape.

### Size limits

```js
const MIN_WIDTH = 66;
const MAX_WIDTH = 490;
```

I worked out these numbers from my screen: a typical MacBook has about 125 pixels per inch, so 66px is about 0.5 inch (a fingernail) and 490px is about 4 inches. They are constants at the top of `main.js` so I can change them. The minimum and maximum heights are calculated from the width by the same 2:1 ratio.

### How I tested it

- **Limits:** asking for a 20×10 window gave 66×33, and asking for 1200×600 gave 490×245.
- **Layout at the extremes:** I checked, for Clock, Timer, and Stopwatch modes at 66, 220, and 490 px wide, that the buttons and display stay inside the window.
- **Looking at it:** I captured the page's rendering to a PNG using `webContents.capturePage()` and viewed the image. This is the fix for a hiccup from Step 2, where `screencapture` could not see the window because macOS blocks that without Screen Recording permission. `capturePage()` asks the page itself for its pixels, so no permission is needed.

## 7b: Opacity

### Why this needed something new

Changing a window's opacity is something only the main process can do (`win.setOpacity()`). But the button lives in the page. Until now, the page and `main.js` never talked to each other. This is the first time they have to.

### Why not just use CSS opacity?

The window itself is not transparent: its background is a solid dark rectangle. CSS opacity would only fade the page's content against that solid background, and I would not see the desktop through the clock. `setOpacity()` changes the whole window.

### The message channel (IPC)

Electron calls messages between the page and the main process IPC (inter-process communication). Three small pieces make it work:

1. **`renderer.js`** (the page) calls `window.clockApp.setOpacity(0.6)`.
2. **`preload.js`** exposes that function to the page:
   ```js
   contextBridge.exposeInMainWorld("clockApp", {
     setOpacity: (value) => ipcRenderer.invoke("set-opacity", value),
   });
   ```
3. **`main.js`** receives it and changes the window:
   ```js
   ipcMain.handle("set-opacity", (event, value) => { ... win.setOpacity(...) });
   ```

### Why a preload script and `contextBridge`?

The page is web content, and web content should not be trusted with full access to Node.js, because any bad code that reached the page could then use the computer. The preload script runs before the page loads, has limited access, and hands the page only what I choose to give it. Here the page gets exactly one function. This is Electron's recommended safe pattern.

### Never trust the message

The main process does not assume that what it receives is sensible:

```js
if (!win || typeof value !== "number" || Number.isNaN(value)) return;
win.setOpacity(Math.min(1, Math.max(0.1, value)));
```

- Anything that is not a real number is ignored.
- Numbers are clamped to 0.1 to 1. The 0.1 floor means the clock can never become completely invisible and lost.

### The button

A ◐ button at the end of the button row cycles through 100%, 80%, 60%, 40%, 20%, then back to 100%. Its tooltip shows the current level. A settings window will replace this in Step 8 with a proper slider.

### How I tested it

- **The cycle:** clicking the button five times moved the real window's opacity through 0.8, 0.6, 0.4, 0.2, and back to 1.
- **Bad input:** I sent `"hello"`, `NaN`, `null`, `undefined`, and `{}` from the page. All were ignored. I sent 5, -3, and 0 and got 1, 0.1, and 0.1.
- **Security:** inside the page, `require` is `undefined`, and the raw `ipcRenderer` is not reachable. The page can only call `setOpacity`.

## Hiccup in this step: the new button made the row cramped and uneven

After adding the ◐ button, everything technically fit, but I looked at the rendered image and saw two problems:

1. In Timer mode, the row had only 5px of space left on each side at the default size.
2. The ◐ button was taller than its neighbours, because that symbol's font has a different height from the letters and arrows.

**The fix:** give every button a fixed height (`height: 2.2rem`, `line-height: 1`) so no symbol can change its size, and tighten the gaps slightly. The row then had 14px of space on each side.

**Lesson:** passing a "does it fit?" check is not the same as looking good. I only noticed because I looked at the actual render.

## What I have not verified

- **Dragging an edge with a real mouse.** I tested the size limits from code. I could not test grabbing the window edge, which is the one place the "whole window is a drag handle" setting from Step 3 could interfere.
- **Settings are not remembered.** Opacity and size reset to their defaults every time the app starts. Saving them comes with the settings window in Step 8.
- **The clock can grow off-screen.** It resizes from its top-left corner, so enlarging it at the top-right could push it past the screen edge.
- **My reading of "four-inch square".** I made the largest size four inches *wide*, which makes it two inches tall because of the 2:1 shape. If I want it taller, the constant and the aspect ratio can change.

## Lessons

1. **Scale with one number.** Setting the root font size from the window width, and writing everything in `rem`, made resizing nearly free.
2. **Know what only the main process can do.** The page cannot change window properties. IPC with a preload bridge is the safe way to ask.
3. **Do not trust incoming messages**, even from your own page. Validate and clamp.
4. **Look at the render.** `capturePage()` solved the Step 2 problem of not being able to see the window, and it caught a cramped layout that a numeric check had passed.
5. **Postponing a step is fine** if the order still works. Resizing and opacity did not need click-through or hotkeys, so skipping Step 6 cost nothing.

## What is next

Step 6 (click-through and hotkeys) is postponed, and Step 8 is the settings window. Both are affected by what I built here: click-through will make the resize edges and the opacity button unreachable by mouse, and the settings window can reuse the preload and IPC pattern from 7b to change and save settings.
