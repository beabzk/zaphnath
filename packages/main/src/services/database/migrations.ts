import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_repositories_table',
    up: `
      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        language TEXT NOT NULL DEFAULT 'en',
        version TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: 'DROP TABLE IF EXISTS repositories;'
  },
  {
    version: 2,
    name: 'create_books_table',
    up: `
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        repository_id TEXT NOT NULL,
        name TEXT NOT NULL,
        abbreviation TEXT NOT NULL,
        testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
        book_order INTEGER NOT NULL,
        chapter_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_books_repository ON books(repository_id);
      CREATE INDEX IF NOT EXISTS idx_books_testament ON books(testament);
      CREATE INDEX IF NOT EXISTS idx_books_order ON books(book_order);
    `,
    down: `
      DROP INDEX IF EXISTS idx_books_order;
      DROP INDEX IF EXISTS idx_books_testament;
      DROP INDEX IF EXISTS idx_books_repository;
      DROP TABLE IF EXISTS books;
    `
  },
  {
    version: 3,
    name: 'create_verses_table',
    up: `
      CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY,
        repository_id TEXT NOT NULL,
        book_id INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_verses_repository ON verses(repository_id);
      CREATE INDEX IF NOT EXISTS idx_verses_book ON verses(book_id);
      CREATE INDEX IF NOT EXISTS idx_verses_chapter ON verses(book_id, chapter);
      CREATE INDEX IF NOT EXISTS idx_verses_location ON verses(book_id, chapter, verse);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_verses_unique ON verses(repository_id, book_id, chapter, verse);
    `,
    down: `
      DROP INDEX IF EXISTS idx_verses_unique;
      DROP INDEX IF EXISTS idx_verses_location;
      DROP INDEX IF EXISTS idx_verses_chapter;
      DROP INDEX IF EXISTS idx_verses_book;
      DROP INDEX IF EXISTS idx_verses_repository;
      DROP TABLE IF EXISTS verses;
    `
  },
  {
    version: 4,
    name: 'create_user_settings_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Insert default settings
      INSERT OR IGNORE INTO user_settings (key, value) VALUES
        ('default_repository', ''),
        ('font_size', '16'),
        ('theme', 'system'),
        ('last_read_book', ''),
        ('last_read_chapter', '1'),
        ('last_read_verse', '1');
    `,
    down: 'DROP TABLE IF EXISTS user_settings;'
  }
];

export class MigrationRunner {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
    this.initializeMigrationTable();
  }

  private initializeMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public getCurrentVersion(): number {
    const result = this.db.prepare('SELECT MAX(version) as version FROM migrations').get() as { version: number | null };
    return result.version || 0;
  }

  public async runMigrations(): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('Database is up to date');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        
        // Run migration in a transaction
        const transaction = this.db.transaction(() => {
          this.db.exec(migration.up);
          this.db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        });
        
        transaction();
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`Failed to apply migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  public async rollback(targetVersion: number): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    
    if (targetVersion >= currentVersion) {
      console.log('Target version is not lower than current version');
      return;
    }

    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Reverse order for rollback

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

    for (const migration of migrationsToRollback) {
      if (!migration.down) {
        throw new Error(`Migration ${migration.version} does not have a rollback script`);
      }

      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        
        const transaction = this.db.transaction(() => {
          this.db.exec(migration.down!);
          this.db.prepare('DELETE FROM migrations WHERE version = ?').run(migration.version);
        });
        
        transaction();
        console.log(`Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        console.error(`Failed to rollback migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log('Rollback completed successfully');
  }
}
