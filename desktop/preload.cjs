const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bouDesktop", {
  getUpdateStatus: () => ipcRenderer.invoke("bou:update-status"),
  updateAction: (action) => ipcRenderer.invoke("bou:update-action", action),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("bou:update-status", listener);
    return () => ipcRenderer.removeListener("bou:update-status", listener);
  },
  openFloating: () => ipcRenderer.invoke("bou:open-floating"),
  closeFloating: () => ipcRenderer.invoke("bou:close-floating"),
  resizeFloating: (width, height) =>
    ipcRenderer.invoke("bou:resize-floating", width, height),
  showEntry: (id) => ipcRenderer.invoke("bou:show-entry", id),
  onEditEntry: (callback) => {
    const listener = (_event, id) => callback(id);
    ipcRenderer.on("bou:edit-entry", listener);
    return () => ipcRenderer.removeListener("bou:edit-entry", listener);
  },
});
