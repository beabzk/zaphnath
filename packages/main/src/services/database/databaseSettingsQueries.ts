import type Database from 'better-sqlite3';

export type DatabaseStats = {
  repositories: number;
  books: number;
  verses: number;
  databaseSize: string;
};

export class DatabaseSettingsQueries {
  constructor(private db: Database.Database) {}

  public getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM user_settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  public setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
  }

  public getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare('SELECT key, value FROM user_settings');
    const rows = stmt.all() as { key: string; value: string }[];
    return rows.reduce(
      (acc, row) => {
        acc[row.key] = row.value;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  public getStats(): DatabaseStats {
    const repositoryCount = this.db.prepare('SELECT COUNT(*) as count FROM repositories').get() as {
      count: number;
    };
    const bookCount = this.db.prepare('SELECT COUNT(*) as count FROM books').get() as {
      count: number;
    };
    const verseCount = this.db.prepare('SELECT COUNT(*) as count FROM verses').get() as {
      count: number;
    };
    const sizeResult = this.db
      .prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
      .get() as { size: number };
    const sizeInMB = (sizeResult.size / (1024 * 1024)).toFixed(2);

    return {
      repositories: repositoryCount.count,
      books: bookCount.count,
      verses: verseCount.count,
      databaseSize: `${sizeInMB} MB`,
    };
  }
}
