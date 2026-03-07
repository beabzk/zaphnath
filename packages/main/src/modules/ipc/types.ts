import type { IpcMainInvokeEvent } from 'electron';

export interface IpcHandlerDependencies {
  assertTrustedIpcSender: (event: IpcMainInvokeEvent, channel: string) => void;
}

export interface DatabaseIpcHandlerDependencies extends IpcHandlerDependencies {
  databaseService: import('../../services/database/index.js').DatabaseService;
  parsePositiveInteger: (value: number | string, fieldName: string) => number;
}

export interface RepositoryIpcHandlerDependencies extends IpcHandlerDependencies {
  databaseService: import('../../services/database/index.js').DatabaseService;
  repositoryService: import('../../services/repository/index.js').RepositoryService;
}
