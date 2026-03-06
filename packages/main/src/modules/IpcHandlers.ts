import {
  ipcMain,
  dialog,
  BrowserWindow,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
} from 'electron';
import { AppModule } from '../AppModule.js';
import { DatabaseService } from '../services/database/index.js';
import { RepositoryService } from '../services/repository/index.js';
import type { ImportOptions } from '../services/repository/types.js';
import { telemetryService } from '../services/telemetry/index.js';
import type { ModuleContext } from '../ModuleContext.js';
import type { AppInitConfig } from '../AppInitConfig.js';
import { getAutoUpdaterModuleInstance, isUpdatePolicy, type UpdatePolicy } from './AutoUpdater.js';

export class IpcHandlers implements AppModule {
  private databaseService: DatabaseService;
  private repositoryService: RepositoryService;
  private readonly allowedRendererOrigins: Set<string>;
  private readonly allowFileProtocol: boolean;

  constructor(renderer: AppInitConfig['renderer']) {
    this.databaseService = DatabaseService.getInstance();
    this.repositoryService = RepositoryService.getInstance();
    this.allowedRendererOrigins = renderer instanceof URL ? new Set([renderer.origin]) : new Set();
    this.allowFileProtocol = renderer instanceof URL ? renderer.protocol === 'file:' : true;
  }

  public async enable(context: ModuleContext): Promise<void> {
    // Initialize services
    await this.databaseService.initialize();
    await this.repositoryService.initialize();
    telemetryService.applyAppSettingsPayload(this.databaseService.getSetting('app_settings'));

    // Register IPC handlers
    this.registerDatabaseHandlers();
    this.registerRepositoryHandlers();
    this.registerFileSystemHandlers();
    this.registerUpdaterHandlers();
    this.registerTelemetryHandlers();

    console.log('IPC handlers registered');

    // Handle app shutdown
    context.app.on('before-quit', async () => {
      await this.shutdown();
    });
  }

  public async shutdown(): Promise<void> {
    // Remove all IPC handlers
    ipcMain.removeAllListeners('database:getBooks');
    ipcMain.removeAllListeners('database:getVerses');
    ipcMain.removeAllListeners('database:getChapter');
    ipcMain.removeAllListeners('repository:import');
    ipcMain.removeAllListeners('repository:validate');
    ipcMain.removeAllListeners('repository:list');
    ipcMain.removeAllListeners('repository:getParentRepositories');
    ipcMain.removeAllListeners('repository:getTranslations');
    ipcMain.removeAllListeners('filesystem:showOpenDialog');
    ipcMain.removeAllListeners('updater:getPolicy');
    ipcMain.removeAllListeners('updater:setPolicy');
    ipcMain.removeAllListeners('updater:checkForUpdates');
    ipcMain.removeAllListeners('telemetry:getPreferences');
    ipcMain.removeAllListeners('telemetry:setPreferences');

    // Shutdown database service
    await this.databaseService.shutdown();

    console.log('IPC handlers removed');
  }

  private assertTrustedIpcSender(event: IpcMainInvokeEvent, channel: string): void {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const senderUrl = event.senderFrame?.url || event.sender.getURL();

    if (!senderWindow || !senderUrl) {
      this.logBlockedIpcSender(channel, senderUrl, 'missing sender window or URL');
      throw new Error('Unauthorized IPC sender');
    }

    let parsedSenderUrl: URL;
    try {
      parsedSenderUrl = new URL(senderUrl);
    } catch {
      this.logBlockedIpcSender(channel, senderUrl, 'invalid sender URL');
      throw new Error('Unauthorized IPC sender');
    }

    const isAllowedFileRequest = this.allowFileProtocol && parsedSenderUrl.protocol === 'file:';
    const isAllowedOrigin = this.allowedRendererOrigins.has(parsedSenderUrl.origin);

    if (isAllowedFileRequest || isAllowedOrigin) {
      return;
    }

    this.logBlockedIpcSender(channel, senderUrl, 'origin is not in the allowlist');
    throw new Error('Unauthorized IPC sender');
  }

  private logBlockedIpcSender(
    channel: string,
    senderUrl: string | undefined,
    reason: string
  ): void {
    console.warn(
      `[IPC] Blocked unauthorized sender for ${channel}. URL: ${
        senderUrl ?? 'unknown'
      }. Reason: ${reason}`
    );
  }

  private parsePositiveInteger(value: number | string, fieldName: string): number {
    const parsedValue = typeof value === 'number' ? value : Number.parseInt(value, 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
      throw new Error(`Invalid ${fieldName}: ${value}`);
    }

    return parsedValue;
  }

  private registerDatabaseHandlers(): void {
    // Get all books
    ipcMain.handle('database:getBooks', async (event, repositoryId?: string) => {
      this.assertTrustedIpcSender(event, 'database:getBooks');
      try {
        return this.databaseService.getBooks(repositoryId);
      } catch (error) {
        console.error('Get books error:', error);
        throw error;
      }
    });

    // Get verses for a specific book and chapter
    ipcMain.handle('database:getVerses', async (event, bookId: number, chapter: number) => {
      this.assertTrustedIpcSender(event, 'database:getVerses');
      try {
        return this.databaseService.getVerses(bookId, chapter);
      } catch (error) {
        console.error('Get verses error:', error);
        throw error;
      }
    });

    // Search verses
    ipcMain.handle('database:searchVerses', async (event, query: string, repositoryId?: string) => {
      this.assertTrustedIpcSender(event, 'database:searchVerses');
      try {
        return this.databaseService.searchVerses(query, repositoryId);
      } catch (error) {
        console.error('Search verses error:', error);
        throw error;
      }
    });

    // Get user setting
    ipcMain.handle('database:getSetting', async (event, key: string) => {
      this.assertTrustedIpcSender(event, 'database:getSetting');
      try {
        return this.databaseService.getSetting(key);
      } catch (error) {
        console.error('Get setting error:', error);
        throw error;
      }
    });

    // Set user setting
    ipcMain.handle('database:setSetting', async (event, key: string, value: string) => {
      this.assertTrustedIpcSender(event, 'database:setSetting');
      try {
        this.databaseService.setSetting(key, value);
        return true;
      } catch (error) {
        console.error('Set setting error:', error);
        throw error;
      }
    });

    // Get database statistics
    ipcMain.handle('database:getStats', async (event) => {
      this.assertTrustedIpcSender(event, 'database:getStats');
      try {
        return this.databaseService.getStats();
      } catch (error) {
        console.error('Get stats error:', error);
        throw error;
      }
    });

    // Get chapter data (verses for a specific book and chapter)
    ipcMain.handle('database:getChapter', async (event, bookId: string, chapterNumber: number) => {
      this.assertTrustedIpcSender(event, 'database:getChapter');
      try {
        const parsedBookId = this.parsePositiveInteger(bookId, 'bookId');
        const parsedChapterNumber = this.parsePositiveInteger(chapterNumber, 'chapterNumber');
        const verses = this.databaseService.getVerses(parsedBookId, parsedChapterNumber);

        return {
          chapter: { number: parsedChapterNumber, book_id: parsedBookId },
          verses,
        };
      } catch (error) {
        console.error('Get chapter error:', error);
        throw error;
      }
    });
  }

  private registerRepositoryHandlers(): void {
    // List all repositories from database
    ipcMain.handle('repository:list', async (event) => {
      this.assertTrustedIpcSender(event, 'repository:list');
      try {
        return this.databaseService.getRepositories();
      } catch (error) {
        console.error('List repositories error:', error);
        throw error;
      }
    });

    // Discover available repositories
    ipcMain.handle('repository:discover', async (event) => {
      this.assertTrustedIpcSender(event, 'repository:discover');
      try {
        return await this.repositoryService.discoverRepositories();
      } catch (error) {
        console.error('Discover repositories error:', error);
        throw error;
      }
    });

    // Import repository
    ipcMain.handle(
      'repository:import',
      async (
        event,
        repositoryUrl: string,
        options?: Zaphnath.RepositoryImportOptions
      ) => {
      this.assertTrustedIpcSender(event, 'repository:import');
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
        return await this.repositoryService.importRepository(importOptions);
      } catch (error) {
        console.error('Import repository error:', error);
        throw error;
      }
      }
    );

    // Validate repository URL
    ipcMain.handle('repository:validate', async (event, url: string) => {
      this.assertTrustedIpcSender(event, 'repository:validate');
      try {
        return await this.repositoryService.validateRepositoryUrl(url);
      } catch (error) {
        console.error('Validate repository error:', error);
        throw error;
      }
    });

    // Get repository manifest
    ipcMain.handle('repository:getManifest', async (event, url: string) => {
      this.assertTrustedIpcSender(event, 'repository:getManifest');
      try {
        return await this.repositoryService.getRepositoryManifest(url);
      } catch (error) {
        console.error('Get repository manifest error:', error);
        throw error;
      }
    });

    // Get repository sources
    ipcMain.handle('repository:getSources', async (event) => {
      this.assertTrustedIpcSender(event, 'repository:getSources');
      try {
        return this.repositoryService.getRepositorySources();
      } catch (error) {
        console.error('Get repository sources error:', error);
        throw error;
      }
    });

    // Add repository source
    ipcMain.handle('repository:addSource', async (event, source: Zaphnath.RepositorySource) => {
      this.assertTrustedIpcSender(event, 'repository:addSource');
      try {
        this.repositoryService.addRepositorySource(source);
        return true;
      } catch (error) {
        console.error('Add repository source error:', error);
        throw error;
      }
    });

    // Scan directory for repositories
    ipcMain.handle('repository:scanDirectory', async (event, directoryPath: string) => {
      this.assertTrustedIpcSender(event, 'repository:scanDirectory');
      try {
        return await this.repositoryService.scanDirectoryForRepositories(directoryPath);
      } catch (error) {
        console.error('Scan directory for repositories error:', error);
        throw error;
      }
    });

    // Delete repository
    ipcMain.handle('repository:delete', async (event, repositoryId: string) => {
      this.assertTrustedIpcSender(event, 'repository:delete');
      try {
        this.databaseService.getQueries().deleteRepository(repositoryId);
        return { success: true };
      } catch (error) {
        console.error('Delete repository error:', error);
        throw error;
      }
    });

    // Get parent repositories
    ipcMain.handle('repository:getParentRepositories', async (event) => {
      this.assertTrustedIpcSender(event, 'repository:getParentRepositories');
      try {
        return this.databaseService.getQueries().getParentRepositories();
      } catch (error) {
        console.error('Get parent repositories error:', error);
        throw error;
      }
    });

    // Get translations for a parent repository
    ipcMain.handle('repository:getTranslations', async (event, parentId: string) => {
      this.assertTrustedIpcSender(event, 'repository:getTranslations');
      try {
        return this.databaseService.getQueries().getRepositoryTranslations(parentId);
      } catch (error) {
        console.error('Get translations error:', error);
        throw error;
      }
    });
  }

  private registerFileSystemHandlers(): void {
    // Show open dialog for directory selection
    ipcMain.handle(
      'filesystem:showOpenDialog',
      async (event, options?: Zaphnath.FileSystemDialogOptions) => {
      this.assertTrustedIpcSender(event, 'filesystem:showOpenDialog');
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const dialogOptions: OpenDialogOptions = {
          ...options,
          properties: options?.properties ? [...options.properties] : ['openDirectory'],
          title: options?.title ?? 'Select Repository Directory',
        };

        const result = focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);
        return result;
      } catch (error) {
        console.error('Show open dialog error:', error);
        throw error;
      }
      }
    );
  }

  private registerUpdaterHandlers(): void {
    ipcMain.handle('updater:getPolicy', async (event) => {
      this.assertTrustedIpcSender(event, 'updater:getPolicy');
      try {
        const updater = getAutoUpdaterModuleInstance();
        return updater?.getPolicy() ?? 'auto';
      } catch (error) {
        console.error('Get updater policy error:', error);
        throw error;
      }
    });

    ipcMain.handle('updater:setPolicy', async (event, policy: UpdatePolicy | string) => {
      this.assertTrustedIpcSender(event, 'updater:setPolicy');
      try {
        if (!isUpdatePolicy(policy)) {
          throw new Error(`Invalid updater policy: ${policy}`);
        }

        const updater = getAutoUpdaterModuleInstance();
        if (!updater) {
          throw new Error('Auto updater module is not available');
        }

        await updater.setPolicy(policy);
        return { success: true, policy };
      } catch (error) {
        console.error('Set updater policy error:', error);
        throw error;
      }
    });

    ipcMain.handle('updater:checkForUpdates', async (event) => {
      this.assertTrustedIpcSender(event, 'updater:checkForUpdates');
      try {
        const updater = getAutoUpdaterModuleInstance();
        if (!updater) {
          throw new Error('Auto updater module is not available');
        }

        return await updater.checkForUpdatesNow();
      } catch (error) {
        console.error('Manual updater check error:', error);
        throw error;
      }
    });
  }

  private registerTelemetryHandlers(): void {
    ipcMain.handle('telemetry:getPreferences', async (event) => {
      this.assertTrustedIpcSender(event, 'telemetry:getPreferences');
      try {
        return telemetryService.getPreferences();
      } catch (error) {
        console.error('Get telemetry preferences error:', error);
        throw error;
      }
    });

    ipcMain.handle(
      'telemetry:setPreferences',
      async (event, preferences: Partial<Zaphnath.TelemetryPreferences>) => {
        this.assertTrustedIpcSender(event, 'telemetry:setPreferences');
        try {
          const updatedPreferences = telemetryService.applyPreferences(preferences);
          return {
            success: true,
            preferences: updatedPreferences,
          };
        } catch (error) {
          console.error('Set telemetry preferences error:', error);
          throw error;
        }
      }
    );
  }
}
