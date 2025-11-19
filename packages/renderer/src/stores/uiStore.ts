import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  UIState,
  LoadingState,
  ErrorState,
  NotificationState,
  SearchResult
} from '@/types/store'

const initialState = {
  currentView: 'reader',
  previousView: null,
  viewHistory: ['reader'],

  globalLoading: { isLoading: false },
  componentLoading: {},

  globalError: null,
  componentErrors: {},

  notifications: [],

  modals: {},

  sidebarOpen: true,
  sidebarWidth: 280,

  searchQuery: '',
  searchResults: [],
  searchLoading: false,
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // View Navigation Actions
        setCurrentView: (view: string) => {
          set((state) => {
            const newHistory = state.currentView !== view
              ? [...state.viewHistory, view]
              : state.viewHistory

            return {
              previousView: state.currentView,
              currentView: view,
              viewHistory: newHistory
            }
          }, false, 'setCurrentView')
        },

        goBack: () => {
          set((state) => {
            if (state.viewHistory.length <= 1) return state

            const newHistory = state.viewHistory.slice(0, -1)
            const previousView = newHistory[newHistory.length - 1]

            return {
              currentView: previousView,
              previousView: state.currentView,
              viewHistory: newHistory
            }
          }, false, 'goBack')
        },

        clearViewHistory: () => {
          set((state) => ({
            viewHistory: [state.currentView],
            previousView: null
          }), false, 'clearViewHistory')
        },

        // Loading State Actions
        setGlobalLoading: (loading: LoadingState) => {
          set({ globalLoading: loading }, false, 'setGlobalLoading')
        },

        setComponentLoading: (component: string, loading: LoadingState) => {
          set((state) => ({
            componentLoading: {
              ...state.componentLoading,
              [component]: loading
            }
          }), false, 'setComponentLoading')
        },

        clearComponentLoading: (component: string) => {
          set((state) => {
            const { [component]: _removed, ...rest } = state.componentLoading
            return { componentLoading: rest }
          }, false, 'clearComponentLoading')
        },

        // Error State Actions
        setGlobalError: (error: ErrorState | null) => {
          set({ globalError: error }, false, 'setGlobalError')
        },

        setComponentError: (component: string, error: ErrorState) => {
          set((state) => ({
            componentErrors: {
              ...state.componentErrors,
              [component]: error
            }
          }), false, 'setComponentError')
        },

        clearComponentError: (component: string) => {
          set((state) => {
            const { [component]: _removed, ...rest } = state.componentErrors
            return { componentErrors: rest }
          }, false, 'clearComponentError')
        },

        clearAllErrors: () => {
          set({
            globalError: null,
            componentErrors: {}
          }, false, 'clearAllErrors')
        },

        // Notification Actions
        addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
          const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const timestamp = new Date().toISOString()

          const newNotification: NotificationState = {
            ...notification,
            id,
            timestamp
          }

          set((state) => ({
            notifications: [...state.notifications, newNotification]
          }), false, 'addNotification')

          // Auto-remove notification after duration
          if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id)
            }, notification.duration)
          }
        },

        removeNotification: (id: string) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }), false, 'removeNotification')
        },

        clearNotifications: () => {
          set({ notifications: [] }, false, 'clearNotifications')
        },

        // Modal Actions
        setModal: (modalId: string, isOpen: boolean) => {
          set((state) => ({
            modals: {
              ...state.modals,
              [modalId]: isOpen
            }
          }), false, 'setModal')
        },

        closeAllModals: () => {
          set({ modals: {} }, false, 'closeAllModals')
        },

        // Sidebar Actions
        setSidebarOpen: (open: boolean) => {
          set({ sidebarOpen: open }, false, 'setSidebarOpen')
        },

        setSidebarWidth: (width: number) => {
          // Clamp width between 200 and 400 pixels
          const clampedWidth = Math.min(400, Math.max(200, width))
          set({ sidebarWidth: clampedWidth }, false, 'setSidebarWidth')
        },

        // Search Actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, false, 'setSearchQuery')
        },

        setSearchResults: (results: SearchResult[]) => {
          set({ searchResults: results }, false, 'setSearchResults')
        },

        setSearchLoading: (loading: boolean) => {
          set({ searchLoading: loading }, false, 'setSearchLoading')
        },

        clearSearch: () => {
          set({
            searchQuery: '',
            searchResults: [],
            searchLoading: false
          }, false, 'clearSearch')
        },
      }),
      {
        name: 'zaphnath-ui-store',
        version: 1,
        partialize: (state) => ({
          currentView: state.currentView,
          viewHistory: state.viewHistory,
          sidebarOpen: state.sidebarOpen,
          sidebarWidth: state.sidebarWidth,
          // Don't persist loading states, errors, notifications, or modals
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
)
