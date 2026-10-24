const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { createSettingsStore, LIMITS } = require("./settings");

// The clock is always twice as wide as it is tall.
const ASPECT_RATIO = 2;
// Gap between the clock and the screen edges.
const MARGIN = 16;
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];

let store;
let clockWindow = null;
let settingsWindow = null;

const heightFor = (width) => Math.round(width / ASPECT_RATIO);
const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

// Is any part of this rectangle on a connected screen?
// A saved position could be on a monitor that is no longer plugged in.
function isOnSomeScreen(rect) {
  return screen.getAllDisplays().some(({ workArea: a }) => {
    return rect.x < a.x + a.width && rect.x + rect.width > a.x && rect.y < a.y + a.height && rect.y + rect.height > a.y;
  });
}

// Where a window of this size sits in one corner of a screen's work area.
// workArea is the screen minus the menu bar and Dock, so the clock never hides under them.
function cornerPosition(corner, area, width, height) {
  const left = corner.endsWith("left");
  const top = corner.startsWith("top");
  return {
    x: left ? area.x + MARGIN : area.x + area.width - width - MARGIN,
    y: top ? area.y + MARGIN : area.y + area.height - height - MARGIN,
  };
}

// Moves a rectangle, if needed, so it is fully inside the screen it is on.
function fitInsideScreen(bounds) {
  const area = screen.getDisplayMatching(bounds).workArea;
  return {
    ...bounds,
    x: clamp(bounds.x, area.x, Math.max(area.x, area.x + area.width - bounds.width)),
    y: clamp(bounds.y, area.y, Math.max(area.y, area.y + area.height - bounds.height)),
  };
}

function startingBounds() {
  const { width, x, y } = store.get();
  const height = heightFor(width);
  if (x !== null && y !== null && isOnSomeScreen({ x, y, width, height })) {
    return { x, y, width, height };
  }
  // First launch, or the saved spot is off-screen: top-right corner.
  const area = screen.getPrimaryDisplay().workArea;
  return { ...cornerPosition("top-right", area, width, height), width, height };
}

// Sends the current settings to every open window.
function broadcastSettings() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("settings:changed", store.get());
  }
}

function createClockWindow() {
  const bounds = startingBounds();

  const win = new BrowserWindow({
    ...bounds,
    // No title bar or window buttons.
    frame: false,
    // A "panel" is a lightweight macOS window (like Spotlight) that is allowed
    // to appear over full-screen apps, and doesn't steal focus from them.
    type: "panel",
    // Drag the edges or corners to resize.
    resizable: true,
    minWidth: LIMITS.minWidth,
    minHeight: heightFor(LIMITS.minWidth),
    maxWidth: LIMITS.maxWidth,
    maxHeight: heightFor(LIMITS.maxWidth),
    // Let the very first click on a button work, even while another app is in front.
    acceptFirstMouse: true,
    webPreferences: {
      // Runs before the page loads and gives it a safe way to message this file.
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Keep the clock's shape while resizing, so everything inside scales evenly.
  win.setAspectRatio(ASPECT_RATIO);
  win.setOpacity(store.get().opacity);

  // Appear in every Space, including the Space of a full-screen app.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // "screen-saver" is one of the highest window levels, above ordinary floating windows.
  win.setAlwaysOnTop(true, "screen-saver");

  // Remember where the clock was left and how big it is.
  const rememberBounds = () => {
    const { x, y, width } = win.getBounds();
    store.update({ x, y, width });
    broadcastSettings();
  };
  win.on("moved", rememberBounds);
  win.on("resized", rememberBounds);

  win.loadFile("index.html");
  clockWindow = win;
}

function openSettingsWindow() {
  // Only one settings window at a time: bring the existing one forward.
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 380,
    height: 440,
    title: "Clock settings",
    show: false,
    resizable: false,
    minimizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Stay above ordinary windows and follow into full-screen Spaces, like the clock does,
  // so it is never hidden behind the app that I opened it from.
  settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  settingsWindow.setAlwaysOnTop(true, "floating");

  settingsWindow.loadFile("settings.html");
  settingsWindow.once("ready-to-show", () => {
    // The clock hides the Dock icon, so the app is not "active" until I ask for it.
    app.focus({ steal: true });
    settingsWindow.show();
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// ---- Messages from the pages ----

ipcMain.handle("settings:get", () => ({ settings: store.get() }));

ipcMain.handle("settings:update", (event, partial) => {
  const before = store.get();
  const after = store.update(partial);
  if (clockWindow) {
    if (after.opacity !== before.opacity) clockWindow.setOpacity(after.opacity);
    if (after.width !== before.width) {
      // Resize from the top-left corner, then nudge back on screen if it now sticks out.
      const { x, y } = clockWindow.getBounds();
      const fitted = fitInsideScreen({ x, y, width: after.width, height: heightFor(after.width) });
      clockWindow.setBounds(fitted);
      store.update({ x: fitted.x, y: fitted.y });
    }
  }
  broadcastSettings();
  return store.get();
});

ipcMain.handle("window:place", (event, corner) => {
  // Only the four known corners are accepted.
  if (!clockWindow || !CORNERS.includes(corner)) return;
  const bounds = clockWindow.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const { x, y } = cornerPosition(corner, area, bounds.width, bounds.height);
  clockWindow.setPosition(x, y);
  store.update({ x, y });
  broadcastSettings();
});

ipcMain.handle("settings:open", () => openSettingsWindow());

app.whenReady().then(() => {
  store = createSettingsStore(path.join(app.getPath("userData"), "settings.json"));

  // Hide the Dock icon: macOS only lets "background" apps draw over full-screen apps.
  app.dock.hide();

  createClockWindow();

  // On macOS, clicking the Dock icon with no windows open should open one again.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createClockWindow();
  });
});

// Make sure the last change is saved before quitting. Saving the clock's position here
// too is a safety net, in case a drag ended without a "moved" event.
app.on("before-quit", () => {
  if (!store) return;
  if (clockWindow && !clockWindow.isDestroyed()) {
    const { x, y, width } = clockWindow.getBounds();
    store.update({ x, y, width });
  }
  store.flush();
});

// Ctrl+C in the terminal should quit properly, so the save above still happens.
process.on("SIGINT", () => app.quit());
process.on("SIGTERM", () => app.quit());

// On macOS apps usually keep running after the last window closes,
// but for now we quit so the terminal doesn't stay stuck.
app.on("window-all-closed", () => {
  app.quit();
});
