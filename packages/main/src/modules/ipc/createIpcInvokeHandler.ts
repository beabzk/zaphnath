import type { IpcMainInvokeEvent } from 'electron';

interface CreateIpcInvokeHandlerOptions<Args extends unknown[], Result> {
  assertTrustedIpcSender: (event: IpcMainInvokeEvent, channel: string) => void;
  channel: string;
  errorLabel: string;
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result> | Result;
}

export function createIpcInvokeHandler<Args extends unknown[], Result>({
  assertTrustedIpcSender,
  channel,
  errorLabel,
  handler,
}: CreateIpcInvokeHandlerOptions<Args, Result>) {
  return async (event: IpcMainInvokeEvent, ...args: Args): Promise<Result> => {
    assertTrustedIpcSender(event, channel);
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`${errorLabel}:`, error);
      throw error;
    }
  };
}

