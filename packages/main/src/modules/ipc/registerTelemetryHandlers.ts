import { ipcMain } from 'electron';
import { telemetryService } from '../../services/telemetry/index.js';
import { createIpcInvokeHandler } from './createIpcInvokeHandler.js';
import type { IpcHandlerDependencies } from './types.js';

export const TELEMETRY_IPC_CHANNELS = [
  'telemetry:getPreferences',
  'telemetry:setPreferences',
] as const;

export function registerTelemetryHandlers({
  assertTrustedIpcSender,
}: IpcHandlerDependencies): void {
  ipcMain.handle(
    'telemetry:getPreferences',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'telemetry:getPreferences',
      errorLabel: 'Get telemetry preferences error',
      handler: async () => telemetryService.getPreferences(),
    })
  );

  ipcMain.handle(
    'telemetry:setPreferences',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'telemetry:setPreferences',
      errorLabel: 'Set telemetry preferences error',
      handler: async (_event, preferences: Partial<Zaphnath.TelemetryPreferences>) => {
        const updatedPreferences = telemetryService.applyPreferences(preferences);
        return {
          success: true,
          preferences: updatedPreferences,
        };
      },
    })
  );
}
