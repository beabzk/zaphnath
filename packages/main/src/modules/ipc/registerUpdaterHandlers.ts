import { ipcMain } from 'electron';
import { getAutoUpdaterModuleInstance, isUpdatePolicy, type UpdatePolicy } from '../AutoUpdater.js';
import { createIpcInvokeHandler } from './createIpcInvokeHandler.js';
import type { IpcHandlerDependencies } from './types.js';

export const UPDATER_IPC_CHANNELS = [
  'updater:getPolicy',
  'updater:setPolicy',
  'updater:checkForUpdates',
] as const;

export function registerUpdaterHandlers({ assertTrustedIpcSender }: IpcHandlerDependencies): void {
  ipcMain.handle(
    'updater:getPolicy',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'updater:getPolicy',
      errorLabel: 'Get updater policy error',
      handler: async () => {
        const updater = getAutoUpdaterModuleInstance();
        return updater?.getPolicy() ?? 'auto';
      },
    })
  );

  ipcMain.handle(
    'updater:setPolicy',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'updater:setPolicy',
      errorLabel: 'Set updater policy error',
      handler: async (_event, policy: UpdatePolicy | string) => {
        if (!isUpdatePolicy(policy)) {
          throw new Error(`Invalid updater policy: ${policy}`);
        }

        const updater = getAutoUpdaterModuleInstance();
        if (!updater) {
          throw new Error('Auto updater module is not available');
        }

        await updater.setPolicy(policy);
        return { success: true, policy };
      },
    })
  );

  ipcMain.handle(
    'updater:checkForUpdates',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'updater:checkForUpdates',
      errorLabel: 'Manual updater check error',
      handler: async () => {
        const updater = getAutoUpdaterModuleInstance();
        if (!updater) {
          throw new Error('Auto updater module is not available');
        }

        return updater.checkForUpdatesNow();
      },
    })
  );
}
