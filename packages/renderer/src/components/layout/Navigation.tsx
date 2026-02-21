import React, { createContext, useContext, useState } from 'react'

// Define the available views in the application
export type AppView =
  | 'reader'
  | 'repositories'
  | 'search'
  | 'bookmarks'
  | 'notes'
  | 'highlights'
  | 'reading-plans'
  | 'downloads'
  | 'settings'
  | 'debug'

interface NavigationContextType {
  currentView: AppView
  setCurrentView: (view: AppView) => void
  viewHistory: AppView[]
  goBack: () => void
  canGoBack: boolean
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

interface NavigationProviderProps {
  children: React.ReactNode
  initialView?: AppView
}

export function NavigationProvider({ children, initialView = 'reader' }: NavigationProviderProps) {
  const [currentView, setCurrentViewState] = useState<AppView>(initialView)
  const [viewHistory, setViewHistory] = useState<AppView[]>([initialView])

  const setCurrentView = (view: AppView) => {
    if (view !== currentView) {
      setViewHistory(prev => [...prev, view])
      setCurrentViewState(view)
    }
  }

  const goBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1)
      const previousView = newHistory[newHistory.length - 1]
      setViewHistory(newHistory)
      setCurrentViewState(previousView)
    }
  }

  const canGoBack = viewHistory.length > 1

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        setCurrentView,
        viewHistory,
        goBack,
        canGoBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// Helper function to get view titles
export function getViewTitle(view: AppView): string {
  const titles: Record<AppView, string> = {
    reader: 'Bible Reader',
    repositories: 'Repository Management',
    search: 'Search',
    bookmarks: 'Bookmarks',
    notes: 'Notes',
    highlights: 'Highlights',
    'reading-plans': 'Reading Plans',
    downloads: 'Downloads',
    settings: 'Settings',
    debug: 'Debug & Error Reporting',
  }
  return titles[view] || 'Bible Reader'
}
