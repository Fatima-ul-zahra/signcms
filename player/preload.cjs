const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("signcmsDesktop", {
  version: () => ipcRenderer.invoke("app-version"),
});
