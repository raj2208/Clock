const { contextBridge, ipcRenderer } = require("electron");

// The page can't talk to the main process directly (that would be a security risk).
// This preload script runs before the page and hands it exactly one safe function.
contextBridge.exposeInMainWorld("clockApp", {
  setOpacity: (value) => ipcRenderer.invoke("set-opacity", value),
});
