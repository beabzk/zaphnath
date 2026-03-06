import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import { createIpcInvokeHandler } from './createIpcInvokeHandler.js';
import type { IpcHandlerDependencies } from './types.js';

export const FILESYSTEM_IPC_CHANNELS = ['filesystem:showOpenDialog'] as const;

export function registerFileSystemHandlers({
  assertTrustedIpcSender,
}: IpcHandlerDependencies): void {
  ipcMain.handle(
    'filesystem:showOpenDialog',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'filesystem:showOpenDialog',
      errorLabel: 'Show open dialog error',
      handler: async (_event, options?: Zaphnath.FileSystemDialogOptions) => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const dialogOptions: OpenDialogOptions = {
          ...options,
          properties: options?.properties ? [...options.properties] : ['openDirectory'],
          title: options?.title ?? 'Select Repository Directory',
        };

        return focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);
      },
    })
  );
}
