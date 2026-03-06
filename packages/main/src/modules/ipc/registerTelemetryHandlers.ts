import { ipcMain } from 'electron';
import { telemetryService } from '../../services/telemetry/index.js';
import type { IpcHandlerDependencies } from './types.js';

export const TELEMETRY_IPC_CHANNELS = [
  'telemetry:getPreferences',
  'telemetry:setPreferences',
] as const;

export function registerTelemetryHandlers({
  assertTrustedIpcSender,
}: IpcHandlerDependencies): void {
  ipcMain.handle('telemetry:getPreferences', async (event) => {
    assertTrustedIpcSender(event, 'telemetry:getPreferences');
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
      assertTrustedIpcSender(event, 'telemetry:setPreferences');
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

