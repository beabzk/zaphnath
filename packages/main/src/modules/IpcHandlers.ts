import { ipcMain, dialog, BrowserWindow } from "electron";
import { AppModule } from "../AppModule.js";
import { DatabaseService } from "../services/database/index.js";
import { RepositoryService } from "../services/repository/index.js";
import type { ModuleContext } from "../ModuleContext.js";

export class IpcHandlers implements AppModule {
  private databaseService: DatabaseService;
  private repositoryService: RepositoryService;
  private context: ModuleContext;

  constructor(context: ModuleContext) {
    this.context = context;
    this.databaseService = DatabaseService.getInstance();
    this.repositoryService = RepositoryService.getInstance();
  }

  public async enable(context: ModuleContext): Promise<void> {
    // Initialize services
    await this.databaseService.initialize();
    await this.repositoryService.initialize();

    // Register IPC handlers
    this.registerDatabaseHandlers();
    this.registerRepositoryHandlers();
    this.registerFileSystemHandlers();

    console.log("IPC handlers registered");

    // Handle app shutdown
    context.app.on("before-quit", async () => {
      await this.shutdown();
    });
  }

  public async shutdown(): Promise<void> {
    // Remove all IPC handlers
    ipcMain.removeAllListeners("database:query");
    ipcMain.removeAllListeners("database:execute");
    ipcMain.removeAllListeners("database:getBooks");
    ipcMain.removeAllListeners("database:getVerses");
    ipcMain.removeAllListeners("database:getChapter");
    ipcMain.removeAllListeners("repository:import");
    ipcMain.removeAllListeners("repository:validate");
    ipcMain.removeAllListeners("repository:list");
    ipcMain.removeAllListeners("repository:getParentRepositories");
    ipcMain.removeAllListeners("repository:getTranslations");
    ipcMain.removeAllListeners("filesystem:showOpenDialog");

    // Shutdown database service
    await this.databaseService.shutdown();

    console.log("IPC handlers removed");
  }

  private registerDatabaseHandlers(): void {
    // Raw database query handler (for advanced usage)
    ipcMain.handle(
      "database:query",
      async (event, sql: string, params?: any[]) => {
        try {
          // TODO: Add origin validation for security
          const queries = this.databaseService.getQueries();
          return queries.executeRaw(sql, params || []);
        } catch (error) {
          console.error("Database query error:", error);
          throw error;
        }
      }
    );

    // Raw database execute handler (for advanced usage)
    ipcMain.handle(
      "database:execute",
      async (event, sql: string, params?: any[]) => {
        try {
          // TODO: Add origin validation for security
          const queries = this.databaseService.getQueries();
          return queries.executeRawRun(sql, params || []);
        } catch (error) {
          console.error("Database execute error:", error);
          throw error;
        }
      }
    );

    // Get all books
    ipcMain.handle(
      "database:getBooks",
      async (event, repositoryId?: string) => {
        try {
          // TODO: Add origin validation for security
          return this.databaseService.getBooks(repositoryId);
        } catch (error) {
          console.error("Get books error:", error);
          throw error;
        }
      }
    );

    // Get verses for a specific book and chapter
    ipcMain.handle(
      "database:getVerses",
      async (event, bookId: number, chapter: number) => {
        try {
          // TODO: Add origin validation for security
          return this.databaseService.getVerses(bookId, chapter);
        } catch (error) {
          console.error("Get verses error:", error);
          throw error;
        }
      }
    );

    // Search verses
    ipcMain.handle(
      "database:searchVerses",
      async (event, query: string, repositoryId?: string) => {
        try {
          // TODO: Add origin validation for security
          return this.databaseService.searchVerses(query, repositoryId);
        } catch (error) {
          console.error("Search verses error:", error);
          throw error;
        }
      }
    );

    // Get user setting
    ipcMain.handle("database:getSetting", async (event, key: string) => {
      try {
        // TODO: Add origin validation for security
        return this.databaseService.getSetting(key);
      } catch (error) {
        console.error("Get setting error:", error);
        throw error;
      }
    });

    // Set user setting
    ipcMain.handle(
      "database:setSetting",
      async (event, key: string, value: string) => {
        try {
          // TODO: Add origin validation for security
          this.databaseService.setSetting(key, value);
          return true;
        } catch (error) {
          console.error("Set setting error:", error);
          throw error;
        }
      }
    );

    // Get database statistics
    ipcMain.handle("database:getStats", async (event) => {
      try {
        // TODO: Add origin validation for security
        return this.databaseService.getStats();
      } catch (error) {
        console.error("Get stats error:", error);
        throw error;
      }
    });

    // Get chapter data (verses for a specific book and chapter)
    ipcMain.handle(
      "database:getChapter",
      async (event, bookId: string, chapterNumber: number) => {
        try {
          // TODO: Add origin validation for security
          const verses = this.databaseService.getVerses(
            parseInt(bookId),
            chapterNumber
          );
          return {
            chapter: { number: chapterNumber, book_id: parseInt(bookId) },
            verses: verses,
          };
        } catch (error) {
          console.error("Get chapter error:", error);
          throw error;
        }
      }
    );
  }

  private registerRepositoryHandlers(): void {
    // List all repositories from database
    ipcMain.handle("repository:list", async (event) => {
      try {
        // TODO: Add origin validation for security
        return this.databaseService.getRepositories();
      } catch (error) {
        console.error("List repositories error:", error);
        throw error;
      }
    });

    // Discover available repositories
    ipcMain.handle("repository:discover", async (event) => {
      try {
        // TODO: Add origin validation for security
        return await this.repositoryService.discoverRepositories();
      } catch (error) {
        console.error("Discover repositories error:", error);
        throw error;
      }
    });

    // Import repository
    ipcMain.handle(
      "repository:import",
      async (event, repositoryUrl: string, options?: any) => {
        try {
          // TODO: Add origin validation for security
          const importOptions = {
            repository_url: repositoryUrl,
            validate_checksums: true,
            download_audio: false,
            overwrite_existing: false,
            ...options,
          };
          return await this.repositoryService.importRepository(importOptions);
        } catch (error) {
          console.error("Import repository error:", error);
          throw error;
        }
      }
    );

    // Validate repository URL
    ipcMain.handle("repository:validate", async (event, url: string) => {
      try {
        // TODO: Add origin validation for security
        return await this.repositoryService.validateRepositoryUrl(url);
      } catch (error) {
        console.error("Validate repository error:", error);
        throw error;
      }
    });

    // Get repository manifest
    ipcMain.handle("repository:getManifest", async (event, url: string) => {
      try {
        // TODO: Add origin validation for security
        return await this.repositoryService.getRepositoryManifest(url);
      } catch (error) {
        console.error("Get repository manifest error:", error);
        throw error;
      }
    });

    // Get repository sources
    ipcMain.handle("repository:getSources", async (event) => {
      try {
        // TODO: Add origin validation for security
        return this.repositoryService.getRepositorySources();
      } catch (error) {
        console.error("Get repository sources error:", error);
        throw error;
      }
    });

    // Add repository source
    ipcMain.handle("repository:addSource", async (event, source: any) => {
      try {
        // TODO: Add origin validation for security
        this.repositoryService.addRepositorySource(source);
        return true;
      } catch (error) {
        console.error("Add repository source error:", error);
        throw error;
      }
    });

    // Scan directory for repositories
    ipcMain.handle(
      "repository:scanDirectory",
      async (event, directoryPath: string) => {
        try {
          // TODO: Add origin validation for security
          return await this.repositoryService.scanDirectoryForRepositories(
            directoryPath
          );
        } catch (error) {
          console.error("Scan directory for repositories error:", error);
          throw error;
        }
      }
    );

    // Get parent repositories
    ipcMain.handle("repository:getParentRepositories", async (event) => {
      try {
        // TODO: Add origin validation for security
        return this.databaseService.getQueries().getParentRepositories();
      } catch (error) {
        console.error("Get parent repositories error:", error);
        throw error;
      }
    });

    // Get translations for a parent repository
    ipcMain.handle(
      "repository:getTranslations",
      async (event, parentId: string) => {
        try {
          // TODO: Add origin validation for security
          return this.databaseService
            .getQueries()
            .getRepositoryTranslations(parentId);
        } catch (error) {
          console.error("Get translations error:", error);
          throw error;
        }
      }
    );
  }

  private registerFileSystemHandlers(): void {
    // Show open dialog for directory selection
    ipcMain.handle("filesystem:showOpenDialog", async (event, options: any) => {
      try {
        // TODO: Add origin validation for security
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const dialogOptions = {
          properties: ["openDirectory"] as const,
          title: "Select Repository Directory",
          ...options,
        };

        const result = focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);
        return result;
      } catch (error) {
        console.error("Show open dialog error:", error);
        throw error;
      }
    });
  }
}
