import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { AppModule } from '../AppModule.js';
import type { AppInitConfig } from '../AppInitConfig.js';
import type { ModuleContext } from '../ModuleContext.js';
import { DatabaseService } from '../services/database/index.js';
import { RepositoryService } from '../services/repository/index.js';
import { telemetryService } from '../services/telemetry/index.js';
import { DATABASE_IPC_CHANNELS, registerDatabaseHandlers } from './ipc/registerDatabaseHandlers.js';
import {
  FILESYSTEM_IPC_CHANNELS,
  registerFileSystemHandlers,
} from './ipc/registerFileSystemHandlers.js';
import {
  REPOSITORY_IPC_CHANNELS,
  registerRepositoryHandlers,
} from './ipc/registerRepositoryHandlers.js';
import {
  TELEMETRY_IPC_CHANNELS,
  registerTelemetryHandlers,
} from './ipc/registerTelemetryHandlers.js';
import { UPDATER_IPC_CHANNELS, registerUpdaterHandlers } from './ipc/registerUpdaterHandlers.js';

const REGISTERED_IPC_CHANNELS = [
  ...DATABASE_IPC_CHANNELS,
  ...REPOSITORY_IPC_CHANNELS,
  ...FILESYSTEM_IPC_CHANNELS,
  ...UPDATER_IPC_CHANNELS,
  ...TELEMETRY_IPC_CHANNELS,
] as const;

export class IpcHandlers implements AppModule {
  private readonly databaseService: DatabaseService;
  private readonly repositoryService: RepositoryService;
  private readonly allowedRendererOrigins: Set<string>;
  private readonly allowFileProtocol: boolean;

  constructor(renderer: AppInitConfig['renderer']) {
    this.databaseService = DatabaseService.getInstance();
    this.repositoryService = RepositoryService.getInstance();
    this.allowedRendererOrigins = renderer instanceof URL ? new Set([renderer.origin]) : new Set();
    this.allowFileProtocol = renderer instanceof URL ? renderer.protocol === 'file:' : true;
  }

  public async enable(context: ModuleContext): Promise<void> {
    await this.databaseService.initialize();
    await this.repositoryService.initialize();
    telemetryService.applyAppSettingsPayload(this.databaseService.getSetting('app_settings'));

    registerDatabaseHandlers({
      databaseService: this.databaseService,
      assertTrustedIpcSender: this.assertTrustedIpcSender,
      parsePositiveInteger: this.parsePositiveInteger,
    });

    registerRepositoryHandlers({
      databaseService: this.databaseService,
      repositoryService: this.repositoryService,
      assertTrustedIpcSender: this.assertTrustedIpcSender,
    });

    registerFileSystemHandlers({
      assertTrustedIpcSender: this.assertTrustedIpcSender,
    });

    registerUpdaterHandlers({
      assertTrustedIpcSender: this.assertTrustedIpcSender,
    });

    registerTelemetryHandlers({
      assertTrustedIpcSender: this.assertTrustedIpcSender,
    });

    console.log('IPC handlers registered');

    context.app.on('before-quit', async () => {
      await this.shutdown();
    });
  }

  public async shutdown(): Promise<void> {
    for (const channel of REGISTERED_IPC_CHANNELS) {
      ipcMain.removeAllListeners(channel);
    }

    await this.databaseService.shutdown();

    console.log('IPC handlers removed');
  }

  private readonly assertTrustedIpcSender = (
    event: IpcMainInvokeEvent,
    channel: string
  ): void => {
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
  };

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

  private readonly parsePositiveInteger = (value: number | string, fieldName: string): number => {
    const parsedValue = typeof value === 'number' ? value : Number.parseInt(value, 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
      throw new Error(`Invalid ${fieldName}: ${value}`);
    }

    return parsedValue;
  };
}

