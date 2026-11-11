const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("signcmsDesktop", {
  version: () => ipcRenderer.invoke("app-version"),
  cacheMedia: (url, filename) => ipcRenderer.invoke("cache-media", { url, filename }),
  pruneCache: (filenames) => ipcRenderer.invoke("cache-prune", filenames),
});
