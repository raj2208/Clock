const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } = require("electron");
const path = require("path");
const { createSettingsStore, FONT_OPTIONS, SOUND_OPTIONS, LIMITS } = require("./settings");

// The window is always twice as wide as it is tall.
const ASPECT_RATIO = 2;
// Gap between the window and the screen edges.
const MARGIN = 16;
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];

let store;
let mainWindow = null;
let settingsWindow = null;
let tray = null;

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
// workArea is the screen minus the menu bar and Dock, so the window never hides under them.
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

function createMainWindow() {
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
      // The end-of-countdown sound plays without anyone clicking at that moment.
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  // Keep the window's shape while resizing, so everything inside scales evenly.
  win.setAspectRatio(ASPECT_RATIO);
  win.setOpacity(store.get().opacity);

  // Appear in every Space, including the Space of a full-screen app.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // "screen-saver" is one of the highest window levels, above ordinary floating windows.
  win.setAlwaysOnTop(true, "screen-saver");

  // Remember where the window was left and how big it is.
  const rememberBounds = () => {
    const { x, y, width } = win.getBounds();
    store.update({ x, y, width });
    broadcastSettings();
  };
  win.on("moved", rememberBounds);
  win.on("resized", rememberBounds);

  win.loadFile("index.html");
  mainWindow = win;
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
    // Tall enough for every section, but never taller than the screen.
    height: Math.min(790, screen.getPrimaryDisplay().workAreaSize.height),
    title: "Time Tracker settings",
    show: false,
    resizable: false,
    minimizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Stay above ordinary windows and follow into full-screen Spaces, like the main window does,
  // so it is never hidden behind the app that I opened it from.
  settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  settingsWindow.setAlwaysOnTop(true, "floating");

  settingsWindow.loadFile("settings.html");
  settingsWindow.once("ready-to-show", () => {
    // The app hides the Dock icon, so the app is not "active" until I ask for it.
    app.focus({ steal: true });
    settingsWindow.show();
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// ---- The menu bar icon ----
//
// The icon at the top of the screen, next to Wi-Fi and the battery. The app has no Dock icon,
// so this is its front door: it is how I show, hide, control, and quit it.

// These must match MODES in renderer.js.
const MODES = ["clock", "timer", "stopwatch"];
const MODE_LABELS = { clock: "Clock", timer: "Timer", stopwatch: "Stopwatch" };

// What the page last told me it is doing, so the menu can show the right labels.
let appState = { mode: "clock", timerRunning: false, stopwatchRunning: false };

// Asks the page to do something (switch mode, start or pause).
function sendCommand(command) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("app:command", command);
}

function toggleMainWindowVisible() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // showInactive() shows the window without taking focus from the app I am using.
  if (mainWindow.isVisible()) mainWindow.hide();
  else mainWindow.showInactive();
  refreshTrayMenu();
}

function buildTrayMenu() {
  const visible = Boolean(mainWindow) && !mainWindow.isDestroyed() && mainWindow.isVisible();
  // "Start or pause" only means something in Timer and Stopwatch mode.
  const canToggle = appState.mode !== "clock";
  const running = appState.mode === "timer" ? appState.timerRunning : appState.stopwatchRunning;
  const toggleLabel = canToggle ? `${running ? "Pause" : "Start"} ${appState.mode}` : "Start or pause";

  return Menu.buildFromTemplate([
    { label: visible ? "Hide Time Tracker" : "Show Time Tracker", click: toggleMainWindowVisible },
    { type: "separator" },
    {
      label: "Mode",
      submenu: MODES.map((mode) => ({
        label: MODE_LABELS[mode],
        type: "radio",
        checked: appState.mode === mode,
        click: () => sendCommand({ type: "set-mode", mode }),
      })),
    },
    { label: toggleLabel, enabled: canToggle, click: () => sendCommand({ type: "toggle" }) },
    { type: "separator" },
    { label: "Settings…", click: openSettingsWindow },
    { type: "separator" },
    { label: "Quit Time Tracker", accelerator: "Command+Q", click: () => app.quit() },
  ]);
}

// A menu cannot change its labels once it is built, so build a new one when something changes.
function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  // "Template" in the file name tells macOS to recolor the icon to suit the menu bar.
  const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "trayIconTemplate.png"));
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("Time Tracker");
  // If the icon file is ever missing, the item would be invisible, so show its name instead.
  if (icon.isEmpty()) tray.setTitle("Time Tracker");
  refreshTrayMenu();

  mainWindow.on("show", refreshTrayMenu);
  mainWindow.on("hide", refreshTrayMenu);
}

// ---- Messages from the pages ----

ipcMain.handle("settings:get", () => ({ settings: store.get(), fonts: FONT_OPTIONS, sounds: SOUND_OPTIONS }));

ipcMain.handle("settings:update", (event, partial) => {
  const before = store.get();
  const after = store.update(partial);
  if (mainWindow) {
    if (after.opacity !== before.opacity) mainWindow.setOpacity(after.opacity);
    if (after.width !== before.width) {
      // Resize from the top-left corner, then nudge back on screen if it now sticks out.
      const { x, y } = mainWindow.getBounds();
      const fitted = fitInsideScreen({ x, y, width: after.width, height: heightFor(after.width) });
      mainWindow.setBounds(fitted);
      store.update({ x: fitted.x, y: fitted.y });
    }
  }
  broadcastSettings();
  return store.get();
});

ipcMain.handle("settings:reset", () => {
  store.reset();
  if (mainWindow) {
    mainWindow.setOpacity(store.get().opacity);
    // Back to the default size, in the top-right corner of the main screen.
    const bounds = startingBounds();
    mainWindow.setBounds(bounds);
    store.update({ x: bounds.x, y: bounds.y });
  }
  broadcastSettings();
  return store.get();
});

ipcMain.handle("window:place", (event, corner) => {
  // Only the four known corners are accepted.
  if (!mainWindow || !CORNERS.includes(corner)) return;
  const bounds = mainWindow.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const { x, y } = cornerPosition(corner, area, bounds.width, bounds.height);
  mainWindow.setPosition(x, y);
  store.update({ x, y });
  broadcastSettings();
});

ipcMain.handle("settings:open", () => openSettingsWindow());

// The page reports what it is doing, so the menu bar menu can show the right labels.
ipcMain.on("app:state", (event, state) => {
  // Only the main window may report, and only a well-formed report is accepted.
  if (!mainWindow || event.sender !== mainWindow.webContents) return;
  if (!state || !MODES.includes(state.mode)) return;
  if (typeof state.timerRunning !== "boolean" || typeof state.stopwatchRunning !== "boolean") return;
  const next = { mode: state.mode, timerRunning: state.timerRunning, stopwatchRunning: state.stopwatchRunning };
  if (JSON.stringify(next) === JSON.stringify(appState)) return;
  appState = next;
  refreshTrayMenu();
});

app.whenReady().then(() => {
  store = createSettingsStore(path.join(app.getPath("userData"), "settings.json"));

  // Hide the Dock icon: macOS only lets "background" apps draw over full-screen apps.
  app.dock.hide();

  createMainWindow();
  createTray();

  // On macOS, clicking the Dock icon with no windows open should open one again.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Make sure the last change is saved before quitting. Saving the window's position here
// too is a safety net, in case a drag ended without a "moved" event.
app.on("before-quit", () => {
  if (!store) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { x, y, width } = mainWindow.getBounds();
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
