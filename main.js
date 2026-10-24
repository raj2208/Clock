const { app, BrowserWindow, screen } = require("electron");

const WIDTH = 220;
const HEIGHT = 80;
// Gap between the clock and the screen edges.
const MARGIN = 16;

function createWindow() {
  // workArea is the screen minus the menu bar and Dock, so the clock never hides under them.
  const { x, y, width } = screen.getPrimaryDisplay().workArea;

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    // Top-right corner.
    x: x + width - WIDTH - MARGIN,
    y: y + MARGIN,
    // No title bar or window buttons.
    frame: false,
    // A "panel" is a lightweight macOS window (like Spotlight) that is allowed
    // to appear over full-screen apps, and doesn't steal focus from them.
    type: "panel",
    // Resizing comes later (Step 7).
    resizable: false,
  });

  // Appear in every Space, including the Space of a full-screen app.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // "screen-saver" is one of the highest window levels, above ordinary floating windows.
  win.setAlwaysOnTop(true, "screen-saver");

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  // Hide the Dock icon: macOS only lets "background" apps draw over full-screen apps.
  app.dock.hide();

  createWindow();

  // On macOS, clicking the Dock icon with no windows open should open one again.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// On macOS apps usually keep running after the last window closes,
// but for now we quit so the terminal doesn't stay stuck.
app.on("window-all-closed", () => {
  app.quit();
});
