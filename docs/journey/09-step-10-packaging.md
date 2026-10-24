# 09: Step 10, packaging the app

**Goal:** turn the project into a real Mac app (`Time Tracker.app`) with a proper icon, and a zip of it that can be shared and later installed with Homebrew.

I built this as three sub-steps and committed each one. (The app was called "Clock" while I did this. It was renamed to Time Tracker right afterwards, see [`08-renaming-to-time-tracker.md`](08-renaming-to-time-tracker.md).)

| Sub-step | Commit message | What it added |
|---|---|---|
| 10a | package the clock into a mac app with pnpm package | `pnpm package` builds the app |
| 10b | add a clock face app icon and pnpm icon script | the icon, and `pnpm icon` to rebuild it |
| 10c | add pnpm dist to make a release zip with checksum | `pnpm dist` builds the app and the zip |

## What is inside the app

The app is two things bundled together:

- **My code**, in a single archive file (`app.asar`): just 10 files, **36 KB**.
- **Electron**, the Chrome-based engine that runs my code: about **251 MB**.

So my code is about 0.01% of the app. Every Electron app carries its own copy of the engine, which is the trade-off I accepted when I chose Electron. The whole app is 253 MB, and zipped it is 114 MB.

## 10a: Packaging

### The tool

I used `@electron/packager`: it takes the project folder and Electron and produces the `.app`. I wrote a small script (`scripts/package.js`) instead of one long command, so each option can be commented.

### What goes inside, and what stays out

Everything I do not want shipped is listed in `LEFT_OUT`: `docs/`, `.git`, `.agents`, `.claude`, `scripts/`, `assets/`, the lock files, `out/` itself, and `node_modules`. I checked the result by listing the archive: exactly the 10 files the app needs.

### Hiccup 1: the packager crashed on pnpm's folder layout

The first build failed with `Failed to locate module "@electron-internal/extract-zip"`. The package was installed, but pnpm keeps packages in a separate store and links them in, while the packager looks for them nested inside its own folder. The usual fixes are a flat layout (`nodeLinker: hoisted`) or not copying `node_modules` at all.

My app has **no runtime dependencies** (everything it uses is built into Electron). `node_modules` only holds build tools, which must never be copied into the app anyway. So I left it out and turned off the "remove unused dependencies" step (`prune: false`). A comment in the script says what to change if I ever add a real dependency.

### Hiccup 2: the signature was broken by renaming

macOS apps carry a code signature. The Electron app I started from was signed as "Electron", and renaming it to "Clock" left a signature that no longer matched. `codesign --verify` reported: `code has no resources but signature indicates they must be present`.

It still launched on my Mac, but a broken signature is the kind of thing that makes other Macs say an app is "damaged". The fix is to sign the whole app again with an **ad-hoc signature**: a free one that needs no Apple account.

### Hiccup 3: the app would not start after re-signing (the instructive one)

I first used the packager's own signing option. The app was signed fine and `codesign --verify` passed, but it **would not launch**:

```
dyld: Library not loaded: @rpath/Electron Framework.framework/Electron Framework
... mapping process and mapped file (non-platform) have different Team IDs
```

The cause: the signature had the **hardened runtime** flag, a stricter mode (Apple requires it for notarization). It only lets an app load code signed by the *same Apple Team ID*. An ad-hoc signature has no Team ID, so the app could not load its own Electron framework.

I tried turning it off with the packager's option (`hardenedRuntime: false`), but the flags still showed `adhoc,runtime`, so the option was ignored. The fix was to stop using the packager's signing and run macOS's own `codesign --force --deep --sign -` after packaging. The flags became plain `adhoc`, the signature verifies, and the app launches.

**Lesson:** a signature that verifies is not the same as an app that runs. Always launch it. And turn the hardened runtime on again only when I have a real Apple identity (Step 13).

### How I tested the packaged app

Normal test tricks do not work on a packaged app: the `-r` option I used to attach test scripts is ignored there. Instead I started the app with Chrome's **remote debugging port** and talked to its windows through it. I checked, on the real packaged app, that:

- there is exactly one window at startup;
- the page loads from inside the archive (`app.asar/index.html`);
- the clock shows a real time and the stylesheet applied;
- the preload bridge works from the archive, and the page has no Node access;
- settings load, clicking the gear opens the settings window, and its slider changes the clock.

All 10 checks passed. I also confirmed that quitting saves the position to the settings file.

## 10b: The icon

- **Source:** I drew it as an SVG (`assets/icon.svg`): a dark rounded square (macOS leaves a margin around icons) with a clock face at 10:10 and a thin red second hand, the same red as the "timer finished" colour. The 12 tick marks are one line rotated, generated by a small script.
- **Building the `.icns`:** `scripts/make-icon.js` has Electron draw the SVG to a 1024 px PNG (Electron is a browser, so it can). The macOS tools `sips` (makes each size) and `iconutil` (bundles them) finish the job. The script also checks that the corners are transparent and the middle is not.
- **Result:** `assets/icon.icns`, 310 KB, which the packager puts into the app. I confirmed the copy inside the app is byte-for-byte my file.

The packager prints a harmless warning about not finding `assets/icon.icon`. That is a newer icon format it also looks for, and `.icns` is all I need.

## 10c: The zip and checksum

- **`ditto`, not `zip`.** A plain `zip` can break the symbolic links inside Electron's frameworks and leave an app that will not open. `ditto` is the macOS tool that keeps them.
- **The checksum** is a SHA-256 fingerprint of the zip, saved next to it in the same format as `shasum -a 256`. Homebrew will use it to check that what it downloads is the right file.
- **`pnpm dist`** runs both steps.

### How I tested it

I unzipped the zip into a fresh folder, as if I had downloaded it, and checked that the copy was **identical** to the built app (`diff -rq`), the four symbolic links were still there, the signature verified, and all 10 checks passed when launched from it.

I also asked macOS's Gatekeeper (`spctl --assess`) what it thinks of the app. Result: **rejected**. That is expected for an ad-hoc signature, and it is what other Macs will say when they download it. Fixing it needs an Apple Developer account (Step 13).

## Mistakes in my own testing

- **A false failure:** I ran my check script twice against the same app. The first run opened the settings window, so the second run saw two windows and picked the wrong one, and reported four failures. The app was fine, and a clean single run passed all 10. Lesson: make a test start from a known state.
- **A hung tool:** Quick Look's thumbnail tool (`qlmanage`), which I tried for an icon preview, hung. I stopped it and used the icon file directly.

## What I have not verified

- **Opening it by double-clicking** and copying it into Applications. My tests launched the program directly.
- **How the icon looks in Finder.** I checked the file, not Finder's rendering.
- **Anything on an Intel Mac.** The build is Apple Silicon only.
- **After the rename:** I rebuilt under the new name and checked the app's name tags, but did not launch it, because I left that to myself.

## Lessons

1. **Read what a tool assumes about your project.** The packager assumed a flat `node_modules`. pnpm does not make one.
2. **A valid signature is not a working app.** Verify, then launch.
3. **Test the real artifact, not the dev version.** The packaged app has different rules (`app.asar`, no `-r`, a signature), so it needs its own checks.
4. **Make a test start from a known state**, or you will chase failures that are not there.
5. **Use the right tool for the job:** `ditto` for zipping, `codesign` for signing.

## What is next

Step 11 is a GitHub Release (upload the zip), then Step 12, the Homebrew tap. Step 13, signing with an Apple Developer account, is optional.
