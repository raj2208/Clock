const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

const WIDTH = 220;
const HEIGHT = 110;
// Smallest and largest width I can resize to. Heights follow from the 2:1 shape.
// On a typical MacBook screen (about 125 pixels per inch) 66 is roughly a fingernail
// and 490 is roughly four inches. Change these to suit your screen.
const MIN_WIDTH = 66;
const MAX_WIDTH = 490;
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
    // Drag the edges or corners to resize.
    resizable: true,
    minWidth: MIN_WIDTH,
    minHeight: MIN_WIDTH * (HEIGHT / WIDTH),
    maxWidth: MAX_WIDTH,
    maxHeight: MAX_WIDTH * (HEIGHT / WIDTH),
    // Let the very first click on a button work, even while another app is in front.
    acceptFirstMouse: true,
    webPreferences: {
      // Runs before the page loads and gives it a safe way to message this file.
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Keep the clock's shape (2:1) while resizing, so everything inside scales evenly.
  win.setAspectRatio(WIDTH / HEIGHT);

  // Appear in every Space, including the Space of a full-screen app.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // "screen-saver" is one of the highest window levels, above ordinary floating windows.
  win.setAlwaysOnTop(true, "screen-saver");

  win.loadFile("index.html");
}

// The page asks for a new opacity; only this file can actually change the window.
ipcMain.handle("set-opacity", (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  // Never trust a message blindly: ignore anything that is not a sensible number.
  // The floor of 0.1 stops the clock from becoming completely invisible.
  if (!win || typeof value !== "number" || Number.isNaN(value)) return;
  win.setOpacity(Math.min(1, Math.max(0.1, value)));
});

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
