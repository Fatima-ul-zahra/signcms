const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { pathToFileURL } = require("node:url");

// BEGIN media-cache
/** Saves downloaded media files in a folder on this PC so the screen can play without the server. */
function createMediaCache(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const safeName = (name) => path.basename(String(name)).replace(/[^a-zA-Z0-9._-]/g, "_");

  // Downloads a file once. Returns the local path. A half-finished download is never used.
  async function ensure(url, filename) {
    const target = path.join(dir, safeName(filename));
    try {
      const stat = await fsp.stat(target);
      if (stat.size > 0) return target;
    } catch {
      /* not saved yet */
    }
    const partial = target + ".part";
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error("Download failed (" + response.status + ")");
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
    await fsp.rename(partial, target);
    return target;
  }

  // Deletes saved files that are no longer in the playlist.
  async function prune(keepNames) {
    const keep = new Set(keepNames.map(safeName));
    for (const file of await fsp.readdir(dir)) {
      if (!keep.has(file)) await fsp.rm(path.join(dir, file), { force: true });
    }
  }

  return { ensure, prune };
}
// END media-cache

// Only one player instance per Mini PC.
if (!app.requestSingleInstanceLock()) app.quit();

// In the installed player, Alt + F4 does not close the screen. In `npm run dev` it still does.
let allowQuit = !app.isPackaged;
let win = null;
let mediaCache = null;

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#080a10",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required", // let videos play with sound without a click
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Recover if the renderer crashes.
  win.webContents.on("render-process-gone", () => win.reload());

  // Ignore accidental closing (Alt + F4). Windows shutdown and restart are still allowed.
  win.on("close", (event) => {
    if (!allowQuit) event.preventDefault();
  });
  win.on("session-end", () => {
    allowQuit = true;
  });

  // Maintenance exit: Ctrl + Shift + Alt + Q
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.type === "keyDown" && input.control && input.shift && input.alt && input.key.toLowerCase() === "q") {
      allowQuit = true;
      app.quit();
    }
  });
}

app.on("before-quit", () => {
  allowQuit = true;
});

app.on("second-instance", () => {
  if (win) {
    win.show();
    win.focus();
  }
});

// If the player itself crashes, start it again.
process.on("uncaughtException", (error) => {
  console.error(error);
  if (app.isPackaged) app.relaunch();
  app.exit(1);
});

app.whenReady().then(() => {
  // Start with Windows once installed (no effect in `npm run dev`).
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });

  mediaCache = createMediaCache(path.join(app.getPath("userData"), "media-cache"));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app-version", () => app.getVersion());

ipcMain.handle("cache-media", async (_event, { url, filename }) => {
  if (!/^https?:\/\//i.test(String(url))) throw new Error("Invalid media URL");
  const file = await mediaCache.ensure(url, filename);
  return pathToFileURL(file).href;
});

ipcMain.handle("cache-prune", async (_event, filenames) => {
  await mediaCache.prune(Array.isArray(filenames) ? filenames : []);
});
