# Comparison: how to build Time Tracker

This file records the options I considered for building an always-on-top clock/timer/stopwatch, and why I chose Electron.

## What Electron is

A normal website lives inside a browser, and the browser decides what it can do. Electron gives a web page its own native window, and the code controls that window directly. It bundles the Chromium browser engine and Node.js, so an app is essentially a web page in its own desktop window. VS Code, Slack, Discord, and Notion are built this way.

An Electron app is a few files:

- `main.js`: the "boss" program. It creates windows and sets their properties: always on top, no title bar, transparent, click-through, global hotkeys.
- `index.html`, CSS, and JS: the clock itself, written like a web page.
- `package.json`: names the app and lists its dependencies.

Run `npm start` and the window appears on the desktop.

## Why a website or Chrome extension does not work

A web page or Chrome extension can only draw inside Chrome. When I switch to another app, or Chrome isn't in front, it is gone. A web page also can't be click-through, can't use global hotkeys, and can't stay over other apps. That rules out the core requirement.

### Document Picture-in-Picture (closest web option)

A web page can open a small window that floats above other windows, even outside Chrome. It is worth a ten-minute experiment, but it falls short:

- It must be opened with a click every time, and doesn't start automatically.
- It has a minimum size, so a fingernail-sized clock is likely not possible.
- Chrome chooses where it appears, so it can't be pinned to the top-right corner.
- It has no click-through, no transparency, and no hotkeys while another app is focused.

## Options compared

| Option | Verdict |
|---|---|
| Website / Chrome extension | Can't leave the browser or stay over other apps. |
| Electron | Has every feature on the list. The clock and settings window are plain web pages. |
| Swift/SwiftUI (native Mac) | Best fit technically. Lighter and most reliable over full-screen apps, but needs a new language and framework. |
| Tauri | Like Electron but lighter. Needs Rust for the backend, which is harder for a first project. |
| Python (Tkinter) | Weak at always-on-top over full-screen apps on macOS. |

## Why Electron

It is the lowest-effort way to get every item on the requirements list. Web skills transfer, there are many tutorials, and the settings window is just another web page.

Trade-off: Electron apps use more memory (roughly 100 MB or more) because each one carries a browser engine. That is fine for a clock.

## Known risk and fallback

Showing over full-screen apps on macOS is the hardest requirement, and Electron has some quirks there. The first build step (an always-on-top countdown over a full-screen YouTube window) tests this early. If it proves unreliable, the fallback is Swift/SwiftUI.

## Decision

Build a desktop app with Electron. A website or extension cannot meet the requirements, because click-through, global hotkeys, and staying above every app all need a desktop app.
