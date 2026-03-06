import { ipcMain } from 'electron';
import { createIpcInvokeHandler } from './createIpcInvokeHandler.js';
import type { DatabaseIpcHandlerDependencies } from './types.js';

export const DATABASE_IPC_CHANNELS = [
  'database:getBooks',
  'database:getVerses',
  'database:searchVerses',
  'database:getSetting',
  'database:setSetting',
  'database:getStats',
  'database:getChapter',
] as const;

export function registerDatabaseHandlers({
  databaseService,
  assertTrustedIpcSender,
  parsePositiveInteger,
}: DatabaseIpcHandlerDependencies): void {
  ipcMain.handle(
    'database:getBooks',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:getBooks',
      errorLabel: 'Get books error',
      handler: async (_event, repositoryId?: string) => databaseService.getBooks(repositoryId),
    })
  );

  ipcMain.handle(
    'database:getVerses',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:getVerses',
      errorLabel: 'Get verses error',
      handler: async (_event, bookId: number, chapter: number) =>
        databaseService.getVerses(bookId, chapter),
    })
  );

  ipcMain.handle(
    'database:searchVerses',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:searchVerses',
      errorLabel: 'Search verses error',
      handler: async (_event, query: string, repositoryId?: string) =>
        databaseService.searchVerses(query, repositoryId),
    })
  );

  ipcMain.handle(
    'database:getSetting',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:getSetting',
      errorLabel: 'Get setting error',
      handler: async (_event, key: string) => databaseService.getSetting(key),
    })
  );

  ipcMain.handle(
    'database:setSetting',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:setSetting',
      errorLabel: 'Set setting error',
      handler: async (_event, key: string, value: string) => {
        databaseService.setSetting(key, value);
        return true;
      },
    })
  );

  ipcMain.handle(
    'database:getStats',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:getStats',
      errorLabel: 'Get stats error',
      handler: async () => databaseService.getStats(),
    })
  );

  ipcMain.handle(
    'database:getChapter',
    createIpcInvokeHandler({
      assertTrustedIpcSender,
      channel: 'database:getChapter',
      errorLabel: 'Get chapter error',
      handler: async (_event, bookId: string, chapterNumber: number) => {
        const parsedBookId = parsePositiveInteger(bookId, 'bookId');
        const parsedChapterNumber = parsePositiveInteger(chapterNumber, 'chapterNumber');
        const verses = databaseService.getVerses(parsedBookId, parsedChapterNumber);

        return {
          chapter: { number: parsedChapterNumber, book_id: parsedBookId },
          verses,
        };
      },
    })
  );
}
