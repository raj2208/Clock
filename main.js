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
    // Stay above other windows, even when another app is in front.
    alwaysOnTop: true,
    // Resizing comes later (Step 7).
    resizable: false,
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
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
