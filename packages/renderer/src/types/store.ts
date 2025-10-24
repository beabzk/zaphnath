// Store type definitions for Zaphnath Bible Reader

export interface Repository {
  id: string;
  name: string;
  description: string;
  language?: string; // Optional for parent repositories
  version: string;
  created_at: string;
  updated_at: string;
  type?: "parent" | "translation"; // Add type field
  parent_id?: string; // For translation repositories
  book_count?: number;
  verse_count?: number;
  is_active?: boolean;
  translations?: TranslationInfo[]; // For parent repositories
}

export interface TranslationInfo {
  id: string;
  name: string;
  directory: string;
  language: string;
  status: string;
  book_count?: number;
  verse_count?: number;
}

export interface Book {
  id: string;
  repository_id: string;
  name: string;
  abbreviation: string;
  testament: "old" | "new";
  order: number;
  chapter_count: number;
}

export interface Chapter {
  id: string;
  book_id: string;
  number: number;
  verse_count: number;
}

export interface Verse {
  id: string;
  chapter_id: string;
  number: number;
  text: string;
}

export interface ReadingLocation {
  repository_id: string;
  book_id: string;
  chapter_number: number;
  verse_number?: number;
}

export interface Bookmark {
  id: string;
  repository_id: string;
  book_id: string;
  chapter_number: number;
  verse_number: number;
  title?: string;
  note?: string;
  created_at: string;
  tags?: string[];
}

export interface Highlight {
  id: string;
  repository_id: string;
  book_id: string;
  chapter_number: number;
  verse_number: number;
  color: string; // CSS class for highlight color
  created_at: string;
}

export interface ReadingHistory {
  id: string;
  repository_id: string;
  book_id: string;
  chapter_number: number;
  verse_number?: number;
  timestamp: string;
  duration?: number; // seconds spent reading
}

export interface SearchResult {
  id: string;
  repository_id: string;
  book_id: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  highlight_start?: number;
  highlight_end?: number;
}

export interface ImportProgress {
  stage: string;
  progress: number;
  message?: string;
  total_books?: number;
  imported_books?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; severity: string }>;
  warnings: Array<{ code: string; message: string; severity: string }>;
}

export interface DatabaseStats {
  repositories: number;
  books: number;
  verses: number;
  databaseSize: string;
  lastUpdated: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  timestamp?: string;
}

export interface NotificationState {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
  timestamp: string;
}

// Store State Interfaces
export interface RepositoryState {
  // Data
  repositories: Repository[];
  currentRepository: Repository | null;
  books: Book[];
  currentBook: Book | null;
  currentChapter: Chapter | null;
  verses: Verse[];

  // UI State
  isLoading: boolean;
  error: ErrorState | null;
  importProgress: ImportProgress | null;
  validationResult: ValidationResult | null;

  // Actions
  setRepositories: (repositories: Repository[]) => void;
  setCurrentRepository: (repository: Repository | null) => void;
  addRepository: (repository: Repository) => void;
  removeRepository: (repositoryId: string) => void;
  updateRepository: (
    repositoryId: string,
    updates: Partial<Repository>
  ) => void;

  setBooks: (books: Book[]) => void;
  setCurrentBook: (book: Book | null) => void;

  setCurrentChapter: (chapter: Chapter | null) => void;
  setVerses: (verses: Verse[]) => void;

  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: ErrorState | null) => void;
  setImportProgress: (progress: ImportProgress | null) => void;
  setValidationResult: (result: ValidationResult | null) => void;

  // Async Actions
  loadRepositories: () => Promise<void>;
  loadBooks: (repositoryId: string) => Promise<void>;
  loadChapter: (bookId: string, chapterNumber: number) => Promise<void>;
  importRepository: (url: string, options?: any) => Promise<boolean>;
  validateRepository: (url: string) => Promise<ValidationResult>;
}

export interface UIState {
  // Current View State
  currentView: string;
  previousView: string | null;
  viewHistory: string[];

  // Loading States
  globalLoading: LoadingState;
  componentLoading: Record<string, LoadingState>;

  // Error States
  globalError: ErrorState | null;
  componentErrors: Record<string, ErrorState>;

  // Notifications
  notifications: NotificationState[];

  // Modal/Dialog States
  modals: Record<string, boolean>;

  // Sidebar State
  sidebarOpen: boolean;
  sidebarWidth: number;

  // Search State
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;

  // Actions
  setCurrentView: (view: string) => void;
  goBack: () => void;
  clearViewHistory: () => void;

  setGlobalLoading: (loading: LoadingState) => void;
  setComponentLoading: (component: string, loading: LoadingState) => void;
  clearComponentLoading: (component: string) => void;

  setGlobalError: (error: ErrorState | null) => void;
  setComponentError: (component: string, error: ErrorState) => void;
  clearComponentError: (component: string) => void;
  clearAllErrors: () => void;

  addNotification: (
    notification: Omit<NotificationState, "id" | "timestamp">
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setModal: (modalId: string, isOpen: boolean) => void;
  closeAllModals: () => void;

  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;

  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchLoading: (loading: boolean) => void;
  clearSearch: () => void;
}

export interface ReadingState {
  // Current Reading Position
  currentLocation: ReadingLocation | null;

  // Reading History
  history: ReadingHistory[];

  // Bookmarks
  bookmarks: Bookmark[];

  // Highlights
  highlights: Highlight[];

  // Reading Preferences (from settings but cached here)
  readingMode: "verse" | "paragraph" | "chapter";
  autoScroll: boolean;
  scrollSpeed: number;
  showVerseNumbers: boolean;
  highlightCurrentVerse: boolean;

  // Actions
  setCurrentLocation: (location: ReadingLocation | null) => void;
  addToHistory: (location: ReadingLocation, duration?: number) => void;
  clearHistory: () => void;

  addBookmark: (bookmark: Omit<Bookmark, "id" | "created_at">) => void;
  removeBookmark: (bookmarkId: string) => void;
  updateBookmark: (bookmarkId: string, updates: Partial<Bookmark>) => void;
  loadBookmarks: () => Promise<void>;

  addHighlight: (highlight: Omit<Highlight, "id" | "created_at">) => void;
  removeHighlight: (highlightId: string) => void;
  updateHighlight: (highlightId: string, updates: Partial<Highlight>) => void;
  loadHighlights: () => Promise<void>;
  getVerseHighlight: (verseId: string) => Highlight | undefined;

  setReadingMode: (mode: "verse" | "paragraph" | "chapter") => void;
  setAutoScroll: (enabled: boolean) => void;
  setScrollSpeed: (speed: number) => void;
  setShowVerseNumbers: (show: boolean) => void;
  setHighlightCurrentVerse: (highlight: boolean) => void;

  // Navigation
  goToVerse: (
    repositoryId: string,
    bookId: string,
    chapter: number,
    verse?: number
  ) => Promise<void>;
  goToNextChapter: () => Promise<void>;
  goToPreviousChapter: () => Promise<void>;
}

// Persistence Configuration
export interface PersistConfig {
  name: string;
  version: number;
  migrate?: (persistedState: any, version: number) => any;
  partialize?: (state: any) => any;
}

// Store Configuration
export interface StoreConfig {
  persist?: PersistConfig;
  devtools?: boolean;
  name?: string;
}
