import {AppModule} from '../AppModule.js';
import electronUpdater, {type AppUpdater, type Logger} from 'electron-updater';
import {Notification} from 'electron';
import {DatabaseService} from '../services/database/index.js';

type DownloadNotification = Parameters<AppUpdater['checkForUpdatesAndNotify']>[0];
const UPDATE_POLICY_SETTING_KEY = 'update_policy';

export type UpdatePolicy = 'auto' | 'notify' | 'manual';

let autoUpdaterInstance: AutoUpdater | null = null;

export function isUpdatePolicy(value: unknown): value is UpdatePolicy {
  return value === 'auto' || value === 'notify' || value === 'manual';
}

export class AutoUpdater implements AppModule {

  readonly #logger: Logger | null;
  readonly #notification: DownloadNotification;
  readonly #databaseService: DatabaseService;
  #policy: UpdatePolicy = 'auto';

  constructor(
    {
      logger = null,
      downloadNotification = undefined,
    }:
      {
        logger?: Logger | null | undefined,
        downloadNotification?: DownloadNotification
      } = {},
  ) {
    this.#logger = logger;
    this.#notification = downloadNotification;
    this.#databaseService = DatabaseService.getInstance();
  }

  async enable(): Promise<void> {
    this.#policy = await this.loadPolicy();
    await this.runAutoUpdater(this.#policy);
  }

  getAutoUpdater(): AppUpdater {
    // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
    // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
    const {autoUpdater} = electronUpdater;
    return autoUpdater;
  }

  getPolicy(): UpdatePolicy {
    return this.#policy;
  }

  async setPolicy(policy: UpdatePolicy): Promise<void> {
    if (policy === this.#policy) {
      await this.persistPolicy(policy);
      return;
    }

    this.#policy = policy;
    await this.persistPolicy(policy);
    await this.runAutoUpdater(policy);
  }

  async runAutoUpdater(policy: UpdatePolicy = this.#policy) {
    if (policy === 'manual') {
      return null;
    }

    const updater = this.configureUpdater(policy);
    try {
      if (policy === 'notify') {
        const result = await updater.checkForUpdates();
        if (result?.isUpdateAvailable) {
          new Notification({
            title: 'Update Available',
            body: `A new version (${result.updateInfo.version}) is available for download.`,
          }).show();
        }
        return result;
      }

      return await updater.checkForUpdatesAndNotify(this.#notification);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('No published versions')) {
          return null;
        }
      }

      throw error;
    }
  }

  configureUpdater(policy: UpdatePolicy): AppUpdater {
    const updater = this.getAutoUpdater();

    updater.logger = this.#logger || null;
    updater.fullChangelog = true;
    updater.autoDownload = policy === 'auto';
    updater.autoInstallOnAppQuit = policy === 'auto';

    if (import.meta.env.VITE_DISTRIBUTION_CHANNEL) {
      updater.channel = import.meta.env.VITE_DISTRIBUTION_CHANNEL;
    }

    return updater;
  }

  async loadPolicy(): Promise<UpdatePolicy> {
    try {
      await this.#databaseService.initialize();
      const policy = this.#databaseService.getSetting(UPDATE_POLICY_SETTING_KEY);
      return isUpdatePolicy(policy) ? policy : 'auto';
    } catch (error) {
      console.warn('Failed to load updater policy. Falling back to auto mode.', error);
      return 'auto';
    }
  }

  async persistPolicy(policy: UpdatePolicy): Promise<void> {
    try {
      await this.#databaseService.initialize();
      this.#databaseService.setSetting(UPDATE_POLICY_SETTING_KEY, policy);
    } catch (error) {
      console.warn('Failed to persist updater policy', error);
    }
  }
}


export function autoUpdater(...args: ConstructorParameters<typeof AutoUpdater>) {
  autoUpdaterInstance = new AutoUpdater(...args);
  return autoUpdaterInstance;
}

export function getAutoUpdaterModuleInstance(): AutoUpdater | null {
  return autoUpdaterInstance;
}
