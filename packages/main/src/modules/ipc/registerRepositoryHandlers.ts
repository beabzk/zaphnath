import { ipcMain } from 'electron';
import type { ImportOptions } from '../../services/repository/types.js';
import { createIpcInvokeHandler } from './createIpcInvokeHandler.js';
import type { RepositoryIpcHandlerDependencies } from './types.js';

export const REPOSITORY_IPC_CHANNELS = [
  'repository:list',
  'repository:discover',
  'repository:import',
  'repository:validate',
  'repository:getManifest',
  'repository:getSources',
  'repository:addSource',
  'repository:scanDirectory',
  'repository:delete',
  'repository:getParentRepositories',
  'repository:getTranslations',
] as const;

export function registerRepositoryHandlers({
  databaseService,
  repositoryService,
  assertTrustedIpcSender,
}: RepositoryIpcHandlerDependencies): void {
  ipcMain.handle(
    'repository:list',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:list',
      errorLabel: 'List repositories error',
      handler: async () => databaseService.getRepositories(),
    })
  );

  ipcMain.handle(
    'repository:discover',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:discover',
      errorLabel: 'Discover repositories error',
      handler: async () => repositoryService.discoverRepositories(),
    })
  );

  ipcMain.handle(
    'repository:import',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:import',
      errorLabel: 'Import repository error',
      handler: async (event, repositoryUrl: string, options?: Zaphnath.RepositoryImportOptions) => {
        const importOptions: ImportOptions = {
          repository_url: repositoryUrl,
          validate_checksums: true,
          download_audio: false,
          overwrite_existing: false,
          ...options,
        };

        importOptions.progress_callback = (progress: unknown) => {
          event.sender.send('repository:importProgress', progress);
        };

        return repositoryService.importRepository(importOptions);
      },
    })
  );

  ipcMain.handle(
    'repository:validate',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:validate',
      errorLabel: 'Validate repository error',
      handler: async (_event, url: string) => repositoryService.validateRepositoryUrl(url),
    })
  );

  ipcMain.handle(
    'repository:getManifest',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:getManifest',
      errorLabel: 'Get repository manifest error',
      handler: async (_event, url: string) => repositoryService.getRepositoryManifest(url),
    })
  );

  ipcMain.handle(
    'repository:getSources',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:getSources',
      errorLabel: 'Get repository sources error',
      handler: async () => repositoryService.getRepositorySources(),
    })
  );

  ipcMain.handle(
    'repository:addSource',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:addSource',
      errorLabel: 'Add repository source error',
      handler: async (_event, source: Zaphnath.RepositorySource) => {
        repositoryService.addRepositorySource(source);
        return true;
      },
    })
  );

  ipcMain.handle(
    'repository:scanDirectory',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:scanDirectory',
      errorLabel: 'Scan directory for repositories error',
      handler: async (_event, directoryPath: string) =>
        repositoryService.scanDirectoryForRepositories(directoryPath),
    })
  );

  ipcMain.handle(
    'repository:delete',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:delete',
      errorLabel: 'Delete repository error',
      handler: async (_event, repositoryId: string) => {
        databaseService.getQueries().deleteRepository(repositoryId);
        return { success: true };
      },
    })
  );

  ipcMain.handle(
    'repository:getParentRepositories',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:getParentRepositories',
      errorLabel: 'Get parent repositories error',
      handler: async () => databaseService.getQueries().getParentRepositories(),
    })
  );

  ipcMain.handle(
    'repository:getTranslations',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'repository:getTranslations',
      errorLabel: 'Get translations error',
      handler: async (_event, parentId: string) =>
        databaseService.getQueries().getRepositoryTranslations(parentId),
    })
  );
}
