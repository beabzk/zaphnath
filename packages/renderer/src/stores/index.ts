// Store exports and utilities

export { useRepositoryStore } from './repositoryStore'
export { useUIStore } from './uiStore'
export { useReadingStore } from './readingStore'

// Re-export types
export type {
  Repository,
  Book,
  Chapter,
  Verse,
  ReadingLocation,
  Bookmark,
  ReadingHistory,
  SearchResult,
  ImportProgress,
  ValidationResult,
  DatabaseStats,
  LoadingState,
  ErrorState,
  NotificationState,
  RepositoryState,
  UIState,
  ReadingState,
} from '@/types/store'

// Store utilities and hooks
import { useRepositoryStore } from './repositoryStore'
import { useUIStore } from './uiStore'
import { useReadingStore } from './readingStore'

// Combined store hooks for common use cases
export const useCurrentRepository = () => {
  const repository = useRepositoryStore(state => state.currentRepository)
  const setRepository = useRepositoryStore(state => state.setCurrentRepository)
  const repositories = useRepositoryStore(state => state.repositories)
  
  return {
    repository,
    setRepository,
    repositories,
  }
}

export const useCurrentBook = () => {
  const book = useRepositoryStore(state => state.currentBook)
  const setBook = useRepositoryStore(state => state.setCurrentBook)
  const books = useRepositoryStore(state => state.books)
  
  return {
    book,
    setBook,
    books,
  }
}

export const useCurrentChapter = () => {
  const chapter = useRepositoryStore(state => state.currentChapter)
  const verses = useRepositoryStore(state => state.verses)
  const loadChapter = useRepositoryStore(state => state.loadChapter)
  
  return {
    chapter,
    verses,
    loadChapter,
  }
}

export const useReadingLocation = () => {
  const location = useReadingStore(state => state.currentLocation)
  const setLocation = useReadingStore(state => state.setCurrentLocation)
  const goToVerse = useReadingStore(state => state.goToVerse)
  const goToNextChapter = useReadingStore(state => state.goToNextChapter)
  const goToPreviousChapter = useReadingStore(state => state.goToPreviousChapter)
  
  return {
    location,
    setLocation,
    goToVerse,
    goToNextChapter,
    goToPreviousChapter,
  }
}

export const useBookmarks = () => {
  const bookmarks = useReadingStore(state => state.bookmarks)
  const addBookmark = useReadingStore(state => state.addBookmark)
  const removeBookmark = useReadingStore(state => state.removeBookmark)
  const updateBookmark = useReadingStore(state => state.updateBookmark)
  const loadBookmarks = useReadingStore(state => state.loadBookmarks)
  
  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    updateBookmark,
    loadBookmarks,
  }
}

export const useReadingHistory = () => {
  const history = useReadingStore(state => state.history)
  const addToHistory = useReadingStore(state => state.addToHistory)
  const clearHistory = useReadingStore(state => state.clearHistory)
  
  return {
    history,
    addToHistory,
    clearHistory,
  }
}

export const useLoadingState = (component?: string) => {
  const globalLoading = useUIStore(state => state.globalLoading)
  const componentLoading = useUIStore(state => 
    component ? state.componentLoading[component] : undefined
  )
  const setGlobalLoading = useUIStore(state => state.setGlobalLoading)
  const setComponentLoading = useUIStore(state => state.setComponentLoading)
  const clearComponentLoading = useUIStore(state => state.clearComponentLoading)
  
  return {
    globalLoading,
    componentLoading,
    setGlobalLoading,
    setComponentLoading: component 
      ? (loading: any) => setComponentLoading(component, loading)
      : setComponentLoading,
    clearComponentLoading: component 
      ? () => clearComponentLoading(component)
      : clearComponentLoading,
  }
}

export const useErrorState = (component?: string) => {
  const globalError = useUIStore(state => state.globalError)
  const componentError = useUIStore(state => 
    component ? state.componentErrors[component] : undefined
  )
  const setGlobalError = useUIStore(state => state.setGlobalError)
  const setComponentError = useUIStore(state => state.setComponentError)
  const clearComponentError = useUIStore(state => state.clearComponentError)
  const clearAllErrors = useUIStore(state => state.clearAllErrors)
  
  return {
    globalError,
    componentError,
    setGlobalError,
    setComponentError: component 
      ? (error: any) => setComponentError(component, error)
      : setComponentError,
    clearComponentError: component 
      ? () => clearComponentError(component)
      : clearComponentError,
    clearAllErrors,
  }
}

export const useNotifications = () => {
  const notifications = useUIStore(state => state.notifications)
  const addNotification = useUIStore(state => state.addNotification)
  const removeNotification = useUIStore(state => state.removeNotification)
  const clearNotifications = useUIStore(state => state.clearNotifications)
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  }
}

export const useModal = (modalId: string) => {
  const isOpen = useUIStore(state => state.modals[modalId] || false)
  const setModal = useUIStore(state => state.setModal)
  const closeAllModals = useUIStore(state => state.closeAllModals)
  
  return {
    isOpen,
    open: () => setModal(modalId, true),
    close: () => setModal(modalId, false),
    toggle: () => setModal(modalId, !isOpen),
    closeAllModals,
  }
}

export const useSidebar = () => {
  const isOpen = useUIStore(state => state.sidebarOpen)
  const width = useUIStore(state => state.sidebarWidth)
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen)
  const setSidebarWidth = useUIStore(state => state.setSidebarWidth)
  
  return {
    isOpen,
    width,
    open: () => setSidebarOpen(true),
    close: () => setSidebarOpen(false),
    toggle: () => setSidebarOpen(!isOpen),
    setWidth: setSidebarWidth,
  }
}

export const useSearch = () => {
  const query = useUIStore(state => state.searchQuery)
  const results = useUIStore(state => state.searchResults)
  const loading = useUIStore(state => state.searchLoading)
  const setQuery = useUIStore(state => state.setSearchQuery)
  const setResults = useUIStore(state => state.setSearchResults)
  const setLoading = useUIStore(state => state.setSearchLoading)
  const clearSearch = useUIStore(state => state.clearSearch)
  
  return {
    query,
    results,
    loading,
    setQuery,
    setResults,
    setLoading,
    clearSearch,
  }
}

// Store debugging utilities (development only)
export const useStoreDebug = () => {
  const repositoryState = useRepositoryStore()
  const uiState = useUIStore()
  const readingState = useReadingStore()
  
  return {
    repository: repositoryState,
    ui: uiState,
    reading: readingState,
    logState: () => {
      console.group('🏪 Store State Debug')
      console.log('📚 Repository Store:', repositoryState)
      console.log('🎨 UI Store:', uiState)
      console.log('📖 Reading Store:', readingState)
      console.groupEnd()
    },
  }
}
