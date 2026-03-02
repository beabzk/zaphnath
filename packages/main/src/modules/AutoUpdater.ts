import { AppModule } from '../AppModule.js';
import electronUpdater, { type AppUpdater, type Logger } from 'electron-updater';
import { Notification, app } from 'electron';
import { DatabaseService } from '../services/database/index.js';

type DownloadNotification = Parameters<AppUpdater['checkForUpdatesAndNotify']>[0];
const UPDATE_POLICY_SETTING_KEY = 'update_policy';

export type UpdatePolicy = 'auto' | 'notify' | 'manual';
export type UpdateCheckResult = {
  checkedAt: string;
  policy: UpdatePolicy;
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  channel: string;
  status: 'ok' | 'no_updates_published' | 'metadata_unavailable';
  message?: string;
};

let autoUpdaterInstance: AutoUpdater | null = null;

export function isUpdatePolicy(value: unknown): value is UpdatePolicy {
  return value === 'auto' || value === 'notify' || value === 'manual';
}

export class AutoUpdater implements AppModule {
  readonly #logger: Logger | null;
  readonly #notification: DownloadNotification;
  readonly #databaseService: DatabaseService;
  #policy: UpdatePolicy = 'auto';

  constructor({
    logger = null,
    downloadNotification = undefined,
  }: {
    logger?: Logger | null | undefined;
    downloadNotification?: DownloadNotification;
  } = {}) {
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
    const { autoUpdater } = electronUpdater;
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
      if (this.isNoPublishedVersionsError(error)) {
        return null;
      }

      throw error;
    }
  }

  async checkForUpdatesNow(): Promise<UpdateCheckResult> {
    const policy = this.#policy;
    const checkedAt = new Date().toISOString();
    const currentVersion = app.getVersion();
    const channel = this.resolveConfiguredChannel() ?? 'latest';

    try {
      let result:
        | Awaited<ReturnType<AppUpdater['checkForUpdates']>>
        | Awaited<ReturnType<AppUpdater['checkForUpdatesAndNotify']>>
        | null;

      if (policy === 'auto') {
        result = await this.runAutoUpdater('auto');
      } else {
        const updater = this.configureUpdater(policy);
        result = await updater.checkForUpdates();

        if (policy === 'notify' && result?.isUpdateAvailable) {
          new Notification({
            title: 'Update Available',
            body: `A new version (${result.updateInfo.version}) is available for download.`,
          }).show();
        }
      }

      return {
        checkedAt,
        policy,
        isUpdateAvailable: Boolean(result?.isUpdateAvailable),
        currentVersion,
        latestVersion: result?.updateInfo?.version || currentVersion,
        channel,
        status: 'ok',
      };
    } catch (error) {
      if (this.isNoPublishedVersionsError(error)) {
        return {
          checkedAt,
          policy,
          isUpdateAvailable: false,
          currentVersion,
          latestVersion: currentVersion,
          channel,
          status: 'no_updates_published',
          message: 'No published updates are available for the configured channel.',
        };
      }

      if (this.isMissingReleaseMetadataError(error)) {
        return {
          checkedAt,
          policy,
          isUpdateAvailable: false,
          currentVersion,
          latestVersion: 'Unknown',
          channel,
          status: 'metadata_unavailable',
          message:
            'Update metadata file is missing from the release assets. Upload the generated update YAML files (for example latest.yml/release.yml and blockmaps).',
        };
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

    const channel = this.resolveConfiguredChannel();
    if (channel) {
      updater.channel = channel;
    }

    return updater;
  }

  private resolveConfiguredChannel(): string | null {
    const raw = import.meta.env.VITE_DISTRIBUTION_CHANNEL;
    if (!raw) {
      return null;
    }

    const normalized = raw.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    // Stable builds should use electron-updater's default channel (latest).
    if (normalized === 'latest' || normalized === 'release' || normalized === 'stable') {
      return null;
    }

    return normalized;
  }

  private isNoPublishedVersionsError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.message.includes('No published versions');
  }

  private isMissingReleaseMetadataError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('cannot find') &&
      message.includes('.yml') &&
      (message.includes('release.yml') || message.includes('latest.yml'))
    );
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
