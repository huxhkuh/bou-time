const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bouDesktop", {
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
