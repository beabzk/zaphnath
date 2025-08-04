import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AppSettings, defaultSettings, settingsValidation } from '@/types/settings'

type SettingsProviderProps = {
  children: React.ReactNode
  storageKey?: string
}

type SettingsProviderState = {
  settings: AppSettings
  updateSetting: <T extends keyof AppSettings>(
    category: T,
    key: keyof AppSettings[T],
    value: AppSettings[T][keyof AppSettings[T]]
  ) => void
  updateSettings: (newSettings: Partial<AppSettings>) => void
  resetSettings: () => void
  resetCategory: (category: keyof AppSettings) => void
  exportSettings: () => string
  importSettings: (settingsJson: string) => Promise<boolean>
  validateSetting: (path: string, value: any) => boolean
  isLoading: boolean
  hasUnsavedChanges: boolean
  saveSettings: () => Promise<void>
}

const initialState: SettingsProviderState = {
  settings: defaultSettings,
  updateSetting: () => null,
  updateSettings: () => null,
  resetSettings: () => null,
  resetCategory: () => null,
  exportSettings: () => '',
  importSettings: async () => false,
  validateSetting: () => true,
  isLoading: false,
  hasUnsavedChanges: false,
  saveSettings: async () => {},
}

const SettingsProviderContext = createContext<SettingsProviderState>(initialState)

export function SettingsProvider({
  children,
  storageKey = 'zaphnath-settings',
}: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedSettings = JSON.parse(stored) as AppSettings
          // Merge with defaults to ensure all properties exist
          const mergedSettings = mergeWithDefaults(parsedSettings, defaultSettings)
          setSettings(mergedSettings)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        // Fall back to defaults
        setSettings(defaultSettings)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [storageKey])

  // Deep merge settings with defaults
  const mergeWithDefaults = (stored: any, defaults: AppSettings): AppSettings => {
    const merged = { ...defaults }
    
    for (const [category, categorySettings] of Object.entries(stored)) {
      if (category in merged && typeof categorySettings === 'object' && categorySettings !== null) {
        const currentCategory = merged[category as keyof AppSettings]
        if (typeof currentCategory === 'object' && currentCategory !== null) {
          merged[category as keyof AppSettings] = {
            ...currentCategory,
            ...categorySettings,
          } as any
        }
      }
    }

    // Update version and lastModified
    merged.version = defaults.version
    merged.lastModified = new Date().toISOString()
    
    return merged
  }

  // Validate a setting value
  const validateSetting = useCallback((path: string, value: any): boolean => {
    const rule = settingsValidation[path]
    if (!rule) return true

    switch (rule.type) {
      case 'number':
        if (typeof value !== 'number') return false
        if (rule.min !== undefined && value < rule.min) return false
        if (rule.max !== undefined && value > rule.max) return false
        break
      case 'string':
        if (typeof value !== 'string') return false
        if (rule.enum && !rule.enum.includes(value)) return false
        break
      case 'boolean':
        if (typeof value !== 'boolean') return false
        break
      case 'array':
        if (!Array.isArray(value)) return false
        break
    }

    return true
  }, [])

  // Update a single setting
  const updateSetting = useCallback(<T extends keyof AppSettings>(
    category: T,
    key: keyof AppSettings[T],
    value: AppSettings[T][keyof AppSettings[T]]
  ) => {
    const path = `${String(category)}.${String(key)}`
    
    if (!validateSetting(path, value)) {
      console.warn(`Invalid setting value for ${path}:`, value)
      return
    }

    setSettings(prev => {
      const currentCategory = prev[category]
      return {
        ...prev,
        [category]: {
          ...(currentCategory as any),
          [key]: value,
        },
        lastModified: new Date().toISOString(),
      }
    })
    
    setHasUnsavedChanges(true)
  }, [validateSetting])

  // Update multiple settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      lastModified: new Date().toISOString(),
    }))
    
    setHasUnsavedChanges(true)
  }, [])

  // Reset all settings to defaults
  const resetSettings = useCallback(() => {
    setSettings({
      ...defaultSettings,
      lastModified: new Date().toISOString(),
    })
    setHasUnsavedChanges(true)
  }, [])

  // Reset a specific category
  const resetCategory = useCallback((category: keyof AppSettings) => {
    setSettings(prev => ({
      ...prev,
      [category]: defaultSettings[category],
      lastModified: new Date().toISOString(),
    }))
    setHasUnsavedChanges(true)
  }, [])

  // Export settings as JSON
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2)
  }, [settings])

  // Import settings from JSON
  const importSettings = useCallback(async (settingsJson: string): Promise<boolean> => {
    try {
      const importedSettings = JSON.parse(settingsJson) as AppSettings
      const mergedSettings = mergeWithDefaults(importedSettings, defaultSettings)
      setSettings(mergedSettings)
      setHasUnsavedChanges(true)
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback(async (): Promise<void> => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings))
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }, [settings, storageKey])

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || isLoading) return

    const timeoutId = setTimeout(() => {
      saveSettings().catch(console.error)
    }, 1000) // Auto-save after 1 second of inactivity

    return () => clearTimeout(timeoutId)
  }, [settings, hasUnsavedChanges, isLoading, saveSettings])

  const value = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    resetCategory,
    exportSettings,
    importSettings,
    validateSetting,
    isLoading,
    hasUnsavedChanges,
    saveSettings,
  }

  return (
    <SettingsProviderContext.Provider value={value}>
      {children}
    </SettingsProviderContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsProviderContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
