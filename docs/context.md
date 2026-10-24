# Context

## Why this project exists

I get distracted a lot while working. I think that if I had a small clock or timer always visible on my screen, I would get distracted less often and end up studying and working more.

## The idea

A small piece of desktop software that shows a clock in the top-right corner of the screen and stays on top of every other window. Even if I switch to Google Chrome, a YouTube video, or any other app, it stays visible so I can glance at it all the time.

## What it should do

- Show the current time.
- Run as a countdown timer, so I can watch it move towards zero.
- Run as a stopwatch.
- Stay always on top of all other windows and screens.
- Sit in the top-right corner of the screen by default.

## Customization (end goal)

The app should be highly customizable.

- **Resizable:** as small as a fingernail, as big as roughly a four-inch square, and anything in between.
- **Transparency/opacity:** adjustable, so it can be faint or solid.
- **Other UI details** (colors, fonts, position, etc.) can be tuned later. They are not needed for the first version.
- **Settings/customization window:** a separate window I can open to change all of the above (size, opacity, colors, fonts, position, hotkeys, and so on) instead of editing code or config files.

## Required behaviours

- **Click-through:** the window ignores mouse clicks so it never blocks what is underneath it.
- **Hotkey to toggle click-through:** decided. A hotkey temporarily turns click-through off so I can drag or resize the clock, then turns it back on.
- **Hotkeys:** keyboard shortcuts, for example to switch between clock, timer, and stopwatch, start/pause, and show/hide.
- **Visible over full-screen apps:** it should stay visible even over a full-screen YouTube video or Chrome window.

## Platform

macOS (I am on a Mac).

## Technology: Electron (proposed)

Electron is a framework for building desktop apps with web technologies (HTML, CSS, JavaScript). It bundles a Chromium browser engine and Node.js together, so an app is essentially a web page shown in its own native window. VS Code, Slack, Discord, and Notion are built this way.

Why it fits this project:

- The clock, timer, and stopwatch are just a small web page, and resizing, opacity, colors, and fonts are simple CSS.
- Electron has window options for this project's needs: always on top (`alwaysOnTop`), transparent and frameless windows, click-through (`setIgnoreMouseEvents`), global hotkeys (`globalShortcut`), and showing on all Spaces and over full-screen apps (`setVisibleOnAllWorkspaces`).
- No native Mac programming knowledge is needed to get started.

Trade-offs: Electron apps use more memory than native apps (roughly 100 MB or more) because each one carries a browser engine. For a tiny clock this is acceptable, but a native Swift/SwiftUI app would be lighter if that ever matters. Python/Tkinter was considered and rejected because it is weaker at staying above everything on macOS.

## Suggested build order

1. An always-on-top countdown timer in the top-right corner (Electron).
2. Confirm it shows over a full-screen Chrome/YouTube window.
3. Add the stopwatch and clock modes.
4. Add click-through and hotkeys.
5. Add resizing and transparency controls.
6. Build the settings/customization window.
7. Polish the UI (colors, fonts, position).

## Open questions

- How should I switch between clock, timer, and stopwatch modes: hotkey, small menu, or both?
- Should the countdown give a signal (sound or color change) when it reaches zero?

## Status

Idea stage. Nothing is built yet. This file records the intent and decisions so I don't have to explain them again.
