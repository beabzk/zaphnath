import { ipcMain } from 'electron';
import type { ImportOptions } from '../../services/repository/types.js';
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
  ipcMain.handle('repository:list', async (event) => {
    assertTrustedIpcSender(event, 'repository:list');
    try {
      return databaseService.getRepositories();
    } catch (error) {
      console.error('List repositories error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:discover', async (event) => {
    assertTrustedIpcSender(event, 'repository:discover');
    try {
      return await repositoryService.discoverRepositories();
    } catch (error) {
      console.error('Discover repositories error:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'repository:import',
    async (event, repositoryUrl: string, options?: Zaphnath.RepositoryImportOptions) => {
      assertTrustedIpcSender(event, 'repository:import');
      try {
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

        return await repositoryService.importRepository(importOptions);
      } catch (error) {
        console.error('Import repository error:', error);
        throw error;
      }
    }
  );

  ipcMain.handle('repository:validate', async (event, url: string) => {
    assertTrustedIpcSender(event, 'repository:validate');
    try {
      return await repositoryService.validateRepositoryUrl(url);
    } catch (error) {
      console.error('Validate repository error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:getManifest', async (event, url: string) => {
    assertTrustedIpcSender(event, 'repository:getManifest');
    try {
      return await repositoryService.getRepositoryManifest(url);
    } catch (error) {
      console.error('Get repository manifest error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:getSources', async (event) => {
    assertTrustedIpcSender(event, 'repository:getSources');
    try {
      return repositoryService.getRepositorySources();
    } catch (error) {
      console.error('Get repository sources error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:addSource', async (event, source: Zaphnath.RepositorySource) => {
    assertTrustedIpcSender(event, 'repository:addSource');
    try {
      repositoryService.addRepositorySource(source);
      return true;
    } catch (error) {
      console.error('Add repository source error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:scanDirectory', async (event, directoryPath: string) => {
    assertTrustedIpcSender(event, 'repository:scanDirectory');
    try {
      return await repositoryService.scanDirectoryForRepositories(directoryPath);
    } catch (error) {
      console.error('Scan directory for repositories error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:delete', async (event, repositoryId: string) => {
    assertTrustedIpcSender(event, 'repository:delete');
    try {
      databaseService.getQueries().deleteRepository(repositoryId);
      return { success: true };
    } catch (error) {
      console.error('Delete repository error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:getParentRepositories', async (event) => {
    assertTrustedIpcSender(event, 'repository:getParentRepositories');
    try {
      return databaseService.getQueries().getParentRepositories();
    } catch (error) {
      console.error('Get parent repositories error:', error);
      throw error;
    }
  });

  ipcMain.handle('repository:getTranslations', async (event, parentId: string) => {
    assertTrustedIpcSender(event, 'repository:getTranslations');
    try {
      return databaseService.getQueries().getRepositoryTranslations(parentId);
    } catch (error) {
      console.error('Get translations error:', error);
      throw error;
    }
  });
}

