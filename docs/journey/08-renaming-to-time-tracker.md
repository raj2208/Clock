# 08: Renaming the project to Time Tracker

**Why:** "Clock" is a very plain name, and macOS already ships a built-in Clock app in the Applications folder. Two apps with the same name side by side would be confusing, and hard to search for. So I renamed everything to **Time Tracker**.

The clock, timer, and stopwatch are still the app's three modes. Only the *project's* name changed.

## What changed

| Where | Before | After |
|---|---|---|
| App name | `Clock.app` | `Time Tracker.app` |
| `package.json` `name` | `clock` | `time-tracker` |
| `package.json` `productName` | (none) | `Time Tracker` |
| Bundle ID | `com.raj2208.clock` | `com.raj2208.timetracker` |
| Build folder | `out/Clock-darwin-arm64/` | `out/Time Tracker-darwin-arm64/` |
| Release zip | `Clock-0.1.0-arm64.zip` | `Time-Tracker-0.1.0-arm64.zip` |
| Window titles | "Clock", "Clock settings" | "Time Tracker", "Time Tracker settings" |
| Page-to-app bridge | `window.clockApp` | `window.timeTrackerApp` |
| Main window variable | `clockWindow` | `mainWindow` |
| Settings folder | `~/Library/Application Support/clock/` | `~/Library/Application Support/Time Tracker/` |
| Local skills | `clock-git-push`, `clock-journey-docs` | `time-tracker-git-push`, `time-tracker-journey-docs` |
| GitHub repo | `raj2208/Clock` | `raj2208/Time-Tracker` (renamed with the GitHub CLI, see below) |
| Homebrew (planned) | `homebrew-clock`, cask `clock` | `homebrew-time-tracker`, cask `time-tracker` |
| README and docs | "Clock" | "Time Tracker" |

## What I deliberately did not rename

- **The "Clock" mode.** The switch between Clock, Timer, and Stopwatch is a feature, not the app's name. The code that draws it (`renderClock`, `data-mode="clock"`) stays.
- **Ordinary uses of the word.** "The clock display", "the system clock", and "o'clock" are just English. Renaming them would make the text worse.
- **The icon.** It is a clock face, which still fits an app that shows the time.
- **Old commit messages.** History stays as it was.

## Two names in `package.json`

- `name` is `time-tracker`: lowercase with a hyphen, the form npm and other tools expect.
- `productName` is `Time Tracker`: the human name, with a space.

Electron builds the app's name (and the folder where it saves settings) from `productName`. That is why the settings folder changed name too.

## Hiccups and decisions

### I could not rename the GitHub repository at first

The `gh` tool (GitHub's command line) was not installed. I could have taken the saved GitHub password out of the macOS keychain and called GitHub's web interface directly, but I did not, because that is using a credential for something beyond what I was asked to do. Instead I suggested renaming it in the browser by hand.

The better answer was to give the assistant a proper, limited login. So I **installed the GitHub CLI** and logged in (see [`03-git-and-workflow.md`](03-git-and-workflow.md)). With that, the rename was one command:

```bash
gh repo rename Time-Tracker --repo raj2208/Clock --yes
git remote set-url origin https://github.com/raj2208/Time-Tracker.git
```

I confirmed on GitHub that the repo is now `raj2208/Time-Tracker` (public, default branch `main`), and that the remote points at the new address. GitHub also redirects the old address to the new one.

### I did not rename the local folder

The project still sits in `Desktop/Clock`. Renaming the folder I am working in would break my shell's working directory in the middle of the work, and would also orphan the notes the AI assistant keeps for this project, because those are stored under the folder's old path. It is a one-line command to do later (`mv`), when nothing is open.

### Your old settings are not carried over

The old folder `~/Library/Application Support/clock/` is no longer used. The renamed app starts with default settings in a new folder, `Time Tracker`. The old folder is harmless and can be deleted by hand.

### Spaces in names

A name with a space is fine for a Mac app, but it changes a few things:

- The packager's output folder is `Time Tracker-darwin-arm64` and the program inside is called `Time Tracker`. Commands that mention them need quotes.
- To force-quit it from Terminal, the command is `pkill -x "Time Tracker"`.
- The zip file is `Time-Tracker-0.1.0-arm64.zip`, with hyphens, because the zip goes into a download link and a Homebrew cask file, and spaces in links are a source of bugs.

### A comment my search missed

One comment wrapped across two lines (`...applies it to the` / `clock, and saves it`), so searching for a phrase on one line did not find it. I found it by reading the lines that still contained the word.

### The old build

I deleted the whole `out/` folder, which held the old `Clock.app` and zip, and built again with `pnpm dist`. I checked the new app's name tags (name, bundle ID, executable) without launching it, because I left the testing to myself.

## How I checked the rename (without running the app)

- A syntax check of every JavaScript file.
- A search to confirm the old internal names (`clockApp`, `clockWindow`, `createClockWindow`) appear nowhere.
- Reading the new app's `Info.plist`: name `Time Tracker`, bundle ID `com.raj2208.timetracker`, executable `Time Tracker`.

I have **not** launched the renamed app. That is for me to do.

## Lessons

1. **Separate the product's name from a feature's name.** The "Clock" mode is a feature, so the rename must not touch it.
2. **A name appears in more places than you think:** window titles, bundle ID, settings folder, file names, skills, docs, and the remote repository.
3. **Find the names, then read what is left.** A search for exact names catches most places. Reading the remaining mentions catches the rest.
4. **Know which steps are yours.** Some steps belong to the person, not the assistant: renaming the folder that is currently open. For the others, give the assistant a proper, limited login (the GitHub CLI) instead of working around the missing one.
5. **Keep technical names friendly to links and commands.** Use hyphens in file names that become download links.
