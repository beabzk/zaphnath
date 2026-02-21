import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  private constructor() {
    // Store database in app's userData directory
    const userDataPath = app.getPath('userData');
    const dbDir = join(userDataPath, 'databases');
    
    // Ensure database directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    this.dbPath = join(dbDir, 'zaphnath.db');
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public connect(): Database.Database {
    if (!this.db) {
      try {
        this.db = new Database(this.dbPath, {
          verbose: process.env.DEBUG_SQL === '1' ? console.log : undefined,
        });
        
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        
        // Set journal mode to WAL for better performance
        this.db.pragma('journal_mode = WAL');
        
        console.log(`Database connected: ${this.dbPath}`);
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    }
    return this.db;
  }

  public disconnect(): void {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        console.log('Database disconnected');
      } catch (error) {
        console.error('Error disconnecting from database:', error);
      }
    }
  }

  public getDatabase(): Database.Database | null {
    return this.db;
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  public isConnected(): boolean {
    return this.db !== null && this.db.open;
  }
}
