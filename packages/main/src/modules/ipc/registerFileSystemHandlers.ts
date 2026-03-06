import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import type { IpcHandlerDependencies } from './types.js';

export const FILESYSTEM_IPC_CHANNELS = ['filesystem:showOpenDialog'] as const;

export function registerFileSystemHandlers({
  assertTrustedIpcSender,
}: IpcHandlerDependencies): void {
  ipcMain.handle(
    'filesystem:showOpenDialog',
    async (event, options?: Zaphnath.FileSystemDialogOptions) => {
      assertTrustedIpcSender(event, 'filesystem:showOpenDialog');
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const dialogOptions: OpenDialogOptions = {
          ...options,
          properties: options?.properties ? [...options.properties] : ['openDirectory'],
          title: options?.title ?? 'Select Repository Directory',
        };

        return focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);
      } catch (error) {
        console.error('Show open dialog error:', error);
        throw error;
      }
    }
  );
}

