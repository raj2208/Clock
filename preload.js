const { contextBridge, ipcRenderer } = require("electron");

// The page can't talk to the main process directly (that would be a security risk).
// This preload script runs before the page and hands it exactly these functions.
contextBridge.exposeInMainWorld("clockApp", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (partial) => ipcRenderer.invoke("settings:update", partial),
  // Calls `callback` with the new settings whenever they change.
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings:changed", (_event, settings) => callback(settings));
  },
});
