import { sha256sum } from "./nodeCrypto.js";
import { versions } from "./versions.js";
import { ipcRenderer } from "electron";

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message);
}

// Database API
const database: Zaphnath.DatabaseAPI = {
  query: (sql: string, params?: any[]) =>
    ipcRenderer.invoke("database:query", sql, params),
  execute: (sql: string, params?: any[]) =>
    ipcRenderer.invoke("database:execute", sql, params),
  getBooks: () => ipcRenderer.invoke("database:getBooks"),
  getVerses: (bookId: number, chapter: number) =>
    ipcRenderer.invoke("database:getVerses", bookId, chapter),
  getStats: () => ipcRenderer.invoke("database:getStats"),
};

// Repository API
const repository: Zaphnath.RepositoryAPI = {
  list: () => ipcRenderer.invoke("repository:list"),
  discover: () => ipcRenderer.invoke("repository:discover"),
  import: (url: string, options?: any) =>
    ipcRenderer.invoke("repository:import", url, options),
  validate: (url: string) => ipcRenderer.invoke("repository:validate", url),
  getManifest: (url: string) =>
    ipcRenderer.invoke("repository:getManifest", url),
  getSources: () => ipcRenderer.invoke("repository:getSources"),
  addSource: (source: any) =>
    ipcRenderer.invoke("repository:addSource", source),
};

export { sha256sum, versions, send, database, repository };
