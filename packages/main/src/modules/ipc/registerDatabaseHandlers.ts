import { ipcMain } from 'electron';
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
  ipcMain.handle('database:getBooks', async (event, repositoryId?: string) => {
    assertTrustedIpcSender(event, 'database:getBooks');
    try {
      return databaseService.getBooks(repositoryId);
    } catch (error) {
      console.error('Get books error:', error);
      throw error;
    }
  });

  ipcMain.handle('database:getVerses', async (event, bookId: number, chapter: number) => {
    assertTrustedIpcSender(event, 'database:getVerses');
    try {
      return databaseService.getVerses(bookId, chapter);
    } catch (error) {
      console.error('Get verses error:', error);
      throw error;
    }
  });

  ipcMain.handle('database:searchVerses', async (event, query: string, repositoryId?: string) => {
    assertTrustedIpcSender(event, 'database:searchVerses');
    try {
      return databaseService.searchVerses(query, repositoryId);
    } catch (error) {
      console.error('Search verses error:', error);
      throw error;
    }
  });

  ipcMain.handle('database:getSetting', async (event, key: string) => {
    assertTrustedIpcSender(event, 'database:getSetting');
    try {
      return databaseService.getSetting(key);
    } catch (error) {
      console.error('Get setting error:', error);
      throw error;
    }
  });

  ipcMain.handle('database:setSetting', async (event, key: string, value: string) => {
    assertTrustedIpcSender(event, 'database:setSetting');
    try {
      databaseService.setSetting(key, value);
      return true;
    } catch (error) {
      console.error('Set setting error:', error);
      throw error;
    }
  });

  ipcMain.handle('database:getStats', async (event) => {
    assertTrustedIpcSender(event, 'database:getStats');
    try {
      return databaseService.getStats();
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  });

  ipcMain.handle('database:getChapter', async (event, bookId: string, chapterNumber: number) => {
    assertTrustedIpcSender(event, 'database:getChapter');
    try {
      const parsedBookId = parsePositiveInteger(bookId, 'bookId');
      const parsedChapterNumber = parsePositiveInteger(chapterNumber, 'chapterNumber');
      const verses = databaseService.getVerses(parsedBookId, parsedChapterNumber);

      return {
        chapter: { number: parsedChapterNumber, book_id: parsedBookId },
        verses,
      };
    } catch (error) {
      console.error('Get chapter error:', error);
      throw error;
    }
  });
}

