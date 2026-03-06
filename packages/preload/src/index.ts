import { sha256sum } from './nodeCrypto.js';
import { versions } from './versions.js';
import { ipcRenderer } from 'electron';
import { applyPreloadTelemetryPreferences } from './telemetry.js';

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message);
}

// Database API
const database: Zaphnath.DatabaseAPI = {
  getBooks: () => ipcRenderer.invoke('database:getBooks'),
  getVerses: (bookId: number, chapter: number) =>
    ipcRenderer.invoke('database:getVerses', bookId, chapter),
  searchVerses: (query: string, repositoryId?: string) =>
    ipcRenderer.invoke('database:searchVerses', query, repositoryId),
  getSetting: (key: string) => ipcRenderer.invoke('database:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('database:setSetting', key, value),
  getStats: () => ipcRenderer.invoke('database:getStats'),
};

// Repository API
const repository: Zaphnath.RepositoryAPI = {
  list: () => ipcRenderer.invoke('repository:list'),
  discover: () => ipcRenderer.invoke('repository:discover'),
  import: (url: string, options?: any) => ipcRenderer.invoke('repository:import', url, options),
  onImportProgress: (callback) => {
    const listener = (_event: unknown, progress: Zaphnath.ImportProgress) => {
      callback(progress);
    };

    ipcRenderer.on('repository:importProgress', listener);
    return () => {
      ipcRenderer.removeListener('repository:importProgress', listener);
    };
  },
  validate: (url: string) => ipcRenderer.invoke('repository:validate', url),
  getManifest: (url: string) => ipcRenderer.invoke('repository:getManifest', url),
  getSources: () => ipcRenderer.invoke('repository:getSources'),
  addSource: (source: any) => ipcRenderer.invoke('repository:addSource', source),
  scanDirectory: (directoryPath: string) =>
    ipcRenderer.invoke('repository:scanDirectory', directoryPath),
  getBooks: (repositoryId: string) => ipcRenderer.invoke('database:getBooks', repositoryId),
  getChapter: (bookId: string, chapterNumber: number) =>
    ipcRenderer.invoke('database:getChapter', bookId, chapterNumber),
  getParentRepositories: () => ipcRenderer.invoke('repository:getParentRepositories'),
  getTranslations: (parentId: string) => ipcRenderer.invoke('repository:getTranslations', parentId),
  delete: (repositoryId: string) => ipcRenderer.invoke('repository:delete', repositoryId),
};

// File System API
const filesystem: Zaphnath.FileSystemAPI = {
  showOpenDialog: (options?: any) => ipcRenderer.invoke('filesystem:showOpenDialog', options),
};

// Auto Updater API
const updater: Zaphnath.UpdaterAPI = {
  getPolicy: () => ipcRenderer.invoke('updater:getPolicy'),
  setPolicy: (policy: 'auto' | 'notify' | 'manual') =>
    ipcRenderer.invoke('updater:setPolicy', policy),
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
};

// Telemetry preferences API
const telemetry: Zaphnath.TelemetryAPI = {
  getPreferences: () => ipcRenderer.invoke('telemetry:getPreferences'),
  setPreferences: async (preferences) => {
    const normalized = {
      crashReportingEnabled:
        preferences.crashReportingEnabled === undefined
          ? undefined
          : Boolean(preferences.crashReportingEnabled),
      sessionReplayEnabled:
        preferences.sessionReplayEnabled === undefined
          ? undefined
          : Boolean(preferences.sessionReplayEnabled),
    };

    await applyPreloadTelemetryPreferences(normalized);
    return ipcRenderer.invoke('telemetry:setPreferences', normalized);
  },
};

export { sha256sum, versions, send, database, repository, filesystem, updater, telemetry };
