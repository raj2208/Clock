# 10: The menu bar icon

**Goal:** give Time Tracker an icon at the top of the screen, next to Wi-Fi and the battery, with a menu to show and hide it, switch mode, start and pause, open settings, and quit.

## Why it was needed

Time Tracker has no Dock icon on purpose: hiding it is one of the things that lets the window appear over full-screen apps (Step 4). But that left the app with **no icon anywhere**. That caused real problems:

- There was no obvious way to **quit** it. I had flagged this as a gap earlier.
- If the window was hidden or lost off-screen, there was nothing to click to get it back.
- Settings could only be opened from the small gear on the window itself.

Apps like a mouse jiggler or a voice-to-text tool solve this the same way: no Dock icon, but an icon in the menu bar.

## Vocabulary

| Term | Meaning |
|---|---|
| **Menu bar** | The strip across the top of the screen |
| **Menu bar extra** / **status item** | An app's icon on the right side of the menu bar |
| **Tray** | Electron's name for it (`Tray`). Windows has a similar "system tray" |
| **Template image** | A plain black-on-transparent icon that macOS recolors itself (white on a dark menu bar, black on a light one) |

## The icon

- **Source:** `assets/tray-icon.svg`: a clock outline (a circle and two hands). It has to be plain black on transparent, because macOS only recolors images like that. The colorful app icon would look wrong there.
- **Script:** `scripts/make-tray-icon.js` renders the SVG and writes two PNGs: `trayIconTemplate.png` (18×18) and `trayIconTemplate@2x.png` (36×36, sharper for Retina screens). `pnpm icon` now builds both this and the app icon.
- **The file name matters.** A name ending in `Template` tells macOS to treat it as a template image, and Electron picks up the `@2x` file by itself when it loads the plain one.
- **The script checks its own work:** the corner must be fully transparent, and every solid pixel must be pure black, or macOS could not recolor it. It throws an error otherwise.

### Hiccup: `UnknownVizError`

The first run of the icon script failed with `Error: UnknownVizError`, which tells me nothing. It meant Electron could not take the picture. The difference from the app icon script (which worked) was that I loaded the drawing from a text address (`data:` URL) and captured it immediately. A hidden window that has never been shown has not painted anything yet. I fixed it by loading from a real temporary file, and waiting two animation frames (`requestAnimationFrame` twice) before capturing.

## The menu

| Item | What it does |
|---|---|
| Hide / Show Time Tracker | Hides or shows the window. The label flips |
| Mode: Clock / Timer / Stopwatch | Radio buttons that switch the window's mode |
| Start / Pause timer (or stopwatch) | Starts or pauses whichever one is on screen. Greyed out in Clock mode |
| Settings… | Opens the settings window |
| Quit Time Tracker | Quits. Shows the `⌘Q` shortcut |

### Menus cannot change their labels, so I rebuild them

Once built, a menu's labels are fixed, but "Start timer" has to become "Pause timer" while the timer runs. So the app builds a new menu every time something it shows changes (`refreshTrayMenu`).

### Keeping the menu in sync with the page

The mode, and whether the timer or stopwatch is running, live in the **page** (`renderer.js`), but the menu lives in the **main process**. So they talk both ways over IPC:

- **Page to main (`app:state`):** the page reports `{ mode, timerRunning, stopwatchRunning }`. It only sends when something changed, not ten times a second. This also covers a timer that finishes by itself.
- **Main to page (`app:command`):** the menu asks the page to `set-mode` or `toggle`.
- **The page stays in charge of the timer logic.** The menu never touches the timer itself, it just asks.

### Validation in both directions

Same rule as before: never trust a message.

- The main process ignores a report unless it comes **from the main window** (not from the settings window, which has the same preload), has a known mode, and has real booleans.
- The page ignores a command unless its type is known and its mode is in the list.
- I tested garbage in both directions: nothing changed, and the menu was not even rebuilt.

### Other decisions

- **`showInactive()` to show the window again.** It brings the window back without taking focus from the app I am using. I tested that it does not take focus.
- **A fallback.** If the icon file is ever missing, the menu bar item would be invisible, so the app shows the text "Time Tracker" instead.
- **The mode names appear in `main.js` and `renderer.js`.** A comment in each says they must match. (It is the one place I did not manage "one source of truth".)

## Packaging: a bug I caught before it shipped

The packaging script left the whole `assets/` folder out of the app, because the app icon is added separately. But the menu bar icon files are loaded **at runtime**, so they have to be inside the app. Left as it was, the packaged app would have started fine and shown the fallback text "Time Tracker" in the menu bar instead of the icon, and no test of the dev version would have shown it. I changed the exclusions to be specific (`icon.svg`, `icon.icns`, `tray-icon.svg`), rebuilt, and listed the archive: both PNGs are inside. The packaged app launches cleanly.

## How I tested it

I could not look at the real menu bar, and macOS has no easy way to click a menu bar menu from a script. So the test script **intercepts the menu as the app builds it** (by wrapping `Menu.buildFromTemplate`), reads its labels, and calls the `click` of each item exactly as macOS would. It checked:

- the icon file loads at 18×18 with the `@2x` version, and the menu exists (it is only built when the tray item exists);
- the starting labels, the radio state, the greyed-out item, and the `⌘Q` shortcut;
- **Mode** menu items switch the real window and the menu follows (including back to Clock);
- start, pause, and resume from the menu really start, freeze, and resume the countdown, and the stopwatch;
- the timer and stopwatch keep running while another mode is on screen;
- a timer that finishes by itself updates the menu;
- Hide and Show work, and Show does not steal focus;
- Settings… opens the settings window;
- bad reports and bad commands change nothing;
- **Quit** really quits (`will-quit` fires) and the settings are saved.

### Mistakes in my own testing

- **A silent no-op:** I tried to spy on the `Tray` by replacing it. That assignment silently did nothing, my script crashed, and the app was left running. I stopped it and checked for the menu instead (it only exists if the tray does).
- **A timing mistake:** one check failed because I waited under a second. The timer rounds up on purpose (Step 5), so it shows `25:00` for its first full second. I reran it with a longer wait and it passed.

## What I have not verified

- **How it looks in the real menu bar:** on light and dark menu bars and over different wallpapers. I checked the file, not the pixels on screen.
- **Clicking the menu with a mouse.** I called each item's handler directly.
- **The `⌘Q` shortcut.** Menu shortcuts only work while the menu is open or the app is active, and this app usually is not. The menu item works, but pressing ⌘Q while another app is in front will not quit Time Tracker.
- **Timers while the window is hidden.** Chromium slows timers in hidden windows. The timer uses real clock times, so it should stay correct, but the display and the "finished" moment could be up to a second late. I did not test it.
- **A crowded menu bar.** macOS can hide icons that do not fit.

## Not included yet

- **Launch at login.** It changes the Mac's login items, so I left it out rather than ship something I could not test without altering your system. It should also only work in the packaged app, not in `pnpm start`.
- **The countdown text beside the icon.** A running timer could show `24:30` in the menu bar. I later decided I do not need it, so it is dropped from the roadmap.

## Lessons

1. **A background app needs a front door.** Hiding the Dock icon is only half a design: something has to replace it.
2. **Menus are static, so rebuild them.**
3. **Keep one owner for the logic.** The page owns the timer, and the menu only asks.
4. **Test the packaged app for runtime files.** A file the dev version finds can be missing from the real app.
5. **Prefer a check that can fail loudly.** A silent no-op (the Tray spy) is worse than an error.
