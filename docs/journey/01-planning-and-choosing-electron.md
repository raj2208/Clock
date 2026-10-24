# 01: Planning and choosing Electron

## The problem

I get distracted a lot while working. I figured that a small clock or timer always visible on screen would help me stay focused and get more done. So the goal was a small program that:

- shows a clock, a countdown timer, and a stopwatch;
- sits in the top-right corner;
- stays on top of every other window, even if I switch to Chrome or a YouTube video;
- can be resized from fingernail-small to about a four-inch square;
- has adjustable transparency, is click-through, and has hotkeys;
- has a settings window for customizing it.

I wrote all of this into `docs/context.md` first, so I would never have to explain it again.

## The key question: does it need to be a desktop app?

I wondered whether a website or a Chrome extension could do it, since I already know web development. The answer is no, and understanding why is the most useful lesson of the planning stage.

A web page or Chrome extension only draws inside Chrome. The moment I switch to another app, it is gone. A web page also cannot be click-through, cannot listen for hotkeys while another app is focused, and cannot stay over other apps.

### The near-miss: Document Picture-in-Picture

Chrome has a feature that lets a web page open a small floating window that stays above other windows, even outside Chrome. It looked promising, but it fails my requirements:

- it must be opened with a click every time;
- it has a minimum size, so "fingernail-sized" probably is not possible;
- Chrome chooses where it appears, so I cannot pin it to the top-right corner;
- it has no click-through, no transparency, and no hotkeys while another app is focused.

## The options I compared

| Option | Verdict |
|---|---|
| Website / Chrome extension | Cannot leave the browser or stay over other apps. |
| **Electron** | Has every feature I need. The clock and settings window are plain web pages. |
| Swift/SwiftUI (native Mac) | Technically the best fit: lighter and most reliable over full-screen apps. But it means learning a new language and framework. |
| Tauri | Like Electron but lighter. Needs Rust for the backend, which is harder for a first project. |
| Python (Tkinter) | Weak at staying above everything on macOS. |

## Why Electron

Electron lets me build a desktop app using HTML, CSS, and JavaScript, which I already know. It bundles the Chromium browser engine and Node.js, so an app is essentially a web page in its own native window that my code controls. VS Code, Slack, Discord, and Notion are built this way.

It has built-in options for everything on my list: always on top, frameless windows, transparency, click-through, global hotkeys, and showing on all Spaces. The trade-off is memory: each Electron app carries a browser engine, so it uses around 100 MB or more. That is fine for a clock.

## How Electron development differs from a website

| Website | Electron |
|---|---|
| `pnpm dev` starts a server and I open `localhost:3000` | `pnpm start` opens a real window on the screen |
| No special structure | Two halves: a main process and a renderer |
| Browser DevTools | DevTools inside the app window |

There is no server. Electron loads `index.html` straight from disk into its own window.

### The two halves

1. **Main process (`main.js`)** runs in Node. It creates windows and controls their behaviour: always on top, position, click-through, hotkeys. There is one per app.
2. **Renderer (`index.html`, CSS, JS)** is the web page inside the window. It draws the clock and runs the timer logic.

## The decision to take small steps

Because I had never used Electron, I planned ten small steps (see `docs/roadmap.md`), with a test after each one and a commit after each working step.

I also put the riskiest requirement, showing over full-screen apps, at Step 4. If Electron could not do it, I wanted to find out early and fall back to Swift, not discover it at the end.

## Known fallback

If Electron cannot reliably stay over full-screen apps, the fallback is Swift/SwiftUI. It turned out not to be needed (see [`02-building-steps-1-to-4.md`](02-building-steps-1-to-4.md)).
