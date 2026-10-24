const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  // On macOS, clicking the Dock icon with no windows open should open one again.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// On macOS apps usually keep running after the last window closes,
// but for now we quit so the terminal doesn't stay stuck.
app.on('window-all-closed', () => {
  app.quit()
})
