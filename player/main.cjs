const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

// Only one player instance per Mini PC.
if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#080a10",
        webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Recover if the renderer crashes.
  win.webContents.on("render-process-gone", () => win.reload());
}

app.whenReady().then(() => {
  // Start with Windows once installed (no effect in `npm run dev`).
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app-version", () => app.getVersion());
