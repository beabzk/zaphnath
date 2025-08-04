/// <reference types="vite/client" />

/**
 * Describes all existing environment variables and their types.
 * Required for Code completion/intellisense and type checking.
 *
 * Note: To prevent accidentally leaking env variables to the client, only variables prefixed with `VITE_` are exposed to your Vite-processed code.
 *
 * @see https://github.com/vitejs/vite/blob/0a699856b248116632c1ac18515c0a5c7cf3d1db/packages/vite/types/importMeta.d.ts#L7-L14 Base Interface.
 * @see https://vitejs.dev/guide/env-and-mode.html#env-files Vite Env Variables Doc.
 */
interface ImportMetaEnv {
  /**
   * URL where `renderer` web page is running.
   * This variable is initialized in scripts/watch.ts
   */
  readonly VITE_DEV_SERVER_URL: undefined | string;

  /** Current app version */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Bible-specific type definitions for Zaphnath
declare namespace Zaphnath {
  // Core Bible data structures
  interface BibleVerse {
    id: number;
    repository_id: string;
    book_id: number;
    chapter: number;
    verse: number;
    text: string;
  }

  interface BibleBook {
    id: number;
    repository_id: string;
    name: string;
    abbreviation: string;
    testament: "OT" | "NT";
    order: number;
    chapter_count: number;
  }

  interface BibleRepository {
    id: string;
    name: string;
    description: string;
    language: string;
    version: string;
    created_at: string;
    updated_at: string;
  }

  // IPC Communication interfaces
  interface DatabaseAPI {
    query: (sql: string, params?: any[]) => Promise<any[]>;
    execute: (sql: string, params?: any[]) => Promise<void>;
    getBooks: () => Promise<BibleBook[]>;
    getVerses: (bookId: number, chapter: number) => Promise<BibleVerse[]>;
    getStats: () => Promise<{
      repositories: number;
      books: number;
      verses: number;
      databaseSize: string;
    }>;
  }

  interface RepositoryAPI {
    list: () => Promise<BibleRepository[]>;
    discover: () => Promise<RepositoryIndexEntry[]>;
    import: (url: string, options?: any) => Promise<ImportResult>;
    validate: (url: string) => Promise<ValidationResult>;
    getManifest: (url: string) => Promise<ZBRSManifest>;
    getSources: () => Promise<RepositorySource[]>;
    addSource: (source: RepositorySource) => Promise<boolean>;
  }

  // ZBRS Types
  interface RepositoryIndexEntry {
    id: string;
    name: string;
    url: string;
    language: string;
    license: string;
    verified: boolean;
    last_updated: string;
    description?: string;
    tags?: string[];
  }

  interface RepositorySource {
    type: "official" | "third-party" | "local";
    url: string;
    name: string;
    enabled: boolean;
    last_checked?: string;
  }

  interface ImportResult {
    success: boolean;
    repository_id: string;
    books_imported: number;
    errors: string[];
    warnings: string[];
    duration_ms: number;
  }

  interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }

  interface ValidationError {
    code: string;
    message: string;
    path?: string;
    severity: "error" | "warning";
  }

  interface ValidationWarning {
    code: string;
    message: string;
    path?: string;
  }

  interface ZBRSManifest {
    zbrs_version: string;
    repository: {
      id: string;
      name: string;
      description: string;
      version: string;
      language: {
        code: string;
        name: string;
        direction: "ltr" | "rtl";
        script?: string;
      };
      translation: {
        type: "formal" | "dynamic" | "paraphrase" | "interlinear";
        year: number;
        copyright: string;
        license: string;
        source: string;
        translators?: string[];
      };
      publisher: {
        name: string;
        url?: string;
        contact?: string;
      };
      created_at: string;
      updated_at: string;
    };
    content: {
      books_count: number;
      testament: {
        old: number;
        new: number;
      };
      features: {
        audio: boolean;
        cross_references: boolean;
        footnotes: boolean;
        study_notes: boolean;
      };
    };
    technical: {
      encoding: "UTF-8";
      compression: "none" | "gzip" | "brotli";
      checksum: string;
      size_bytes: number;
    };
    extensions?: Record<string, any>;
  }
}
