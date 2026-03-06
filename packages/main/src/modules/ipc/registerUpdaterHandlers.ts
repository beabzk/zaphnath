import { ipcMain } from 'electron';
import { getAutoUpdaterModuleInstance, isUpdatePolicy, type UpdatePolicy } from '../AutoUpdater.js';
import type { IpcHandlerDependencies } from './types.js';

export const UPDATER_IPC_CHANNELS = [
  'updater:getPolicy',
  'updater:setPolicy',
  'updater:checkForUpdates',
] as const;

export function registerUpdaterHandlers({ assertTrustedIpcSender }: IpcHandlerDependencies): void {
  ipcMain.handle('updater:getPolicy', async (event) => {
    assertTrustedIpcSender(event, 'updater:getPolicy');
    try {
      const updater = getAutoUpdaterModuleInstance();
      return updater?.getPolicy() ?? 'auto';
    } catch (error) {
      console.error('Get updater policy error:', error);
      throw error;
    }
  });

  ipcMain.handle('updater:setPolicy', async (event, policy: UpdatePolicy | string) => {
    assertTrustedIpcSender(event, 'updater:setPolicy');
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
    assertTrustedIpcSender(event, 'updater:checkForUpdates');
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

