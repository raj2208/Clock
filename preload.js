const { contextBridge, ipcRenderer } = require("electron");

// The page can't talk to the main process directly (that would be a security risk).
// This preload script runs before the page and hands it exactly these functions.
contextBridge.exposeInMainWorld("timeTrackerApp", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (partial) => ipcRenderer.invoke("settings:update", partial),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  // Calls `callback` with the new settings whenever they change.
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings:changed", (_event, settings) => callback(settings));
  },
  openSettings: () => ipcRenderer.invoke("settings:open"),
  // Tells the menu bar menu what the page is doing: { mode, timerRunning, stopwatchRunning }.
  reportState: (state) => ipcRenderer.send("app:state", state),
  // Calls `callback` when the menu bar menu asks the page to do something.
  onCommand: (callback) => {
    ipcRenderer.on("app:command", (_event, command) => callback(command));
  },
  // corner is "top-left", "top-right", "bottom-left", or "bottom-right".
  placeWindow: (corner) => ipcRenderer.invoke("window:place", corner),
});
