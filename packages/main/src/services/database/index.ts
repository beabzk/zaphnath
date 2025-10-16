import { DatabaseConnection } from "./connection.js";
import { MigrationRunner } from "./migrations.js";
import { DatabaseQueries } from "./queries.js";

export class DatabaseService {
  private static instance: DatabaseService;
  private connection: DatabaseConnection;
  private queries: DatabaseQueries;
  private migrationRunner: MigrationRunner;
  private isInitialized = false;

  private constructor() {
    this.connection = DatabaseConnection.getInstance();
    this.queries = new DatabaseQueries();
    this.migrationRunner = new MigrationRunner(this.connection.connect());
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Initializing database service...");

      // Connect to database
      const db = this.connection.connect();

      // Initialize migration runner and run migrations
      this.migrationRunner = new MigrationRunner(db);

      // Debug schema before migrations
      console.log("=== BEFORE MIGRATIONS ===");
      this.migrationRunner.debugDatabaseSchema();

      await this.migrationRunner.runMigrations();

      // Debug schema after migrations
      console.log("=== AFTER MIGRATIONS ===");
      this.migrationRunner.debugDatabaseSchema();

      // Initialize queries
      this.queries = new DatabaseQueries();

      this.isInitialized = true;
      console.log("Database service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database service:", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.connection) {
      this.connection.disconnect();
      this.isInitialized = false;
      console.log("Database service shut down");
    }
  }

  public getQueries(): DatabaseQueries {
    if (!this.isInitialized) {
      throw new Error(
        "Database service not initialized. Call initialize() first."
      );
    }
    return this.queries;
  }

  public getConnection(): DatabaseConnection {
    return this.connection;
  }

  public getMigrationRunner(): MigrationRunner {
    if (!this.isInitialized) {
      throw new Error(
        "Database service not initialized. Call initialize() first."
      );
    }
    return this.migrationRunner;
  }

  public isReady(): boolean {
    return this.isInitialized && this.connection.isConnected();
  }

  public debugSchema(): void {
    if (!this.isInitialized) {
      throw new Error(
        "Database service not initialized. Call initialize() first."
      );
    }
    this.migrationRunner.debugDatabaseSchema();
  }

  // Convenience methods that delegate to queries
  public getRepositories(): Zaphnath.BibleRepository[] {
    return this.queries.getRepositories();
  }

  public getBooks(repositoryId?: string): Zaphnath.BibleBook[] {
    return this.queries.getBooks(repositoryId);
  }

  public getVerses(bookId: number, chapter: number): Zaphnath.BibleVerse[] {
    return this.queries.getVerses(bookId, chapter);
  }

  public searchVerses(
    query: string,
    repositoryId?: string
  ): Zaphnath.BibleVerse[] {
    return this.queries.searchVerses(query, repositoryId);
  }

  public getSetting(key: string): string | null {
    return this.queries.getSetting(key);
  }

  public setSetting(key: string, value: string): void {
    return this.queries.setSetting(key, value);
  }

  public getStats(): {
    repositories: number;
    books: number;
    verses: number;
    databaseSize: string;
  } {
    return this.queries.getStats();
  }
}

// Export individual components for advanced usage
export { DatabaseConnection } from "./connection.js";
export { MigrationRunner, migrations } from "./migrations.js";
export { DatabaseQueries } from "./queries.js";

// Export the main service as default
export default DatabaseService;
