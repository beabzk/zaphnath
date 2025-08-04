// Settings type definitions for Zaphnath Bible Reader

export interface AppSettings {
  appearance: AppearanceSettings
  reading: ReadingSettings
  audio: AudioSettings
  advanced: AdvancedSettings
  version: string
  lastModified: string
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number // 12-24px
  fontFamily: string
  lineHeight: number // 1.2-2.0
  textAlign: 'left' | 'center' | 'justify'
  columnLayout: 'single' | 'double'
  showVerseNumbers: boolean
  highlightCurrentVerse: boolean
  compactMode: boolean
  sidebarWidth: number // 200-400px
}

export interface ReadingSettings {
  defaultRepository: string | null
  defaultBook: string | null
  defaultChapter: number | null
  autoScroll: boolean
  scrollSpeed: number // 1-10
  readingMode: 'verse' | 'paragraph' | 'chapter'
  showCrossReferences: boolean
  showFootnotes: boolean
  enableReadingPlans: boolean
  dailyReadingReminder: boolean
  reminderTime: string // HH:MM format
  readingHistory: boolean
  bookmarks: {
    autoSync: boolean
    maxBookmarks: number
  }
}

export interface AudioSettings {
  enabled: boolean
  defaultVoice: string
  speechRate: number // 0.5-2.0
  speechPitch: number // 0.5-2.0
  speechVolume: number // 0.0-1.0
  autoPlay: boolean
  highlightSpokenText: boolean
  pauseBetweenVerses: number // 0-3000ms
  downloadQuality: 'low' | 'medium' | 'high'
  offlineMode: boolean
}

export interface AdvancedSettings {
  language: string // UI language
  dataDirectory: string
  cacheSize: number // MB
  enableLogging: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  enableAnalytics: boolean
  autoUpdate: boolean
  experimentalFeatures: boolean
  developerMode: boolean
  database: {
    autoBackup: boolean
    backupInterval: number // hours
    maxBackups: number
  }
  performance: {
    enableGPUAcceleration: boolean
    preloadNextChapter: boolean
    cacheImages: boolean
  }
}

// Default settings
export const defaultSettings: AppSettings = {
  appearance: {
    theme: 'system',
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.6,
    textAlign: 'left',
    columnLayout: 'single',
    showVerseNumbers: true,
    highlightCurrentVerse: true,
    compactMode: false,
    sidebarWidth: 280,
  },
  reading: {
    defaultRepository: null,
    defaultBook: null,
    defaultChapter: null,
    autoScroll: false,
    scrollSpeed: 5,
    readingMode: 'verse',
    showCrossReferences: true,
    showFootnotes: true,
    enableReadingPlans: true,
    dailyReadingReminder: false,
    reminderTime: '08:00',
    readingHistory: true,
    bookmarks: {
      autoSync: true,
      maxBookmarks: 1000,
    },
  },
  audio: {
    enabled: false,
    defaultVoice: 'system',
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 0.8,
    autoPlay: false,
    highlightSpokenText: true,
    pauseBetweenVerses: 500,
    downloadQuality: 'medium',
    offlineMode: false,
  },
  advanced: {
    language: 'en',
    dataDirectory: '',
    cacheSize: 500,
    enableLogging: true,
    logLevel: 'info',
    enableAnalytics: false,
    autoUpdate: true,
    experimentalFeatures: false,
    developerMode: false,
    database: {
      autoBackup: true,
      backupInterval: 24,
      maxBackups: 7,
    },
    performance: {
      enableGPUAcceleration: true,
      preloadNextChapter: true,
      cacheImages: true,
    },
  },
  version: '1.0.0',
  lastModified: new Date().toISOString(),
}

// Settings validation schemas
export interface SettingsValidationRule {
  min?: number
  max?: number
  required?: boolean
  type: 'string' | 'number' | 'boolean' | 'array'
  enum?: string[]
}

export const settingsValidation: Record<string, SettingsValidationRule> = {
  'appearance.fontSize': { type: 'number', min: 12, max: 24 },
  'appearance.lineHeight': { type: 'number', min: 1.2, max: 2.0 },
  'appearance.sidebarWidth': { type: 'number', min: 200, max: 400 },
  'reading.scrollSpeed': { type: 'number', min: 1, max: 10 },
  'audio.speechRate': { type: 'number', min: 0.5, max: 2.0 },
  'audio.speechPitch': { type: 'number', min: 0.5, max: 2.0 },
  'audio.speechVolume': { type: 'number', min: 0.0, max: 1.0 },
  'audio.pauseBetweenVerses': { type: 'number', min: 0, max: 3000 },
  'advanced.cacheSize': { type: 'number', min: 100, max: 2000 },
  'advanced.database.backupInterval': { type: 'number', min: 1, max: 168 },
  'advanced.database.maxBackups': { type: 'number', min: 1, max: 30 },
}

// Settings categories for UI organization
export const settingsCategories = [
  {
    id: 'appearance',
    name: 'Appearance',
    description: 'Customize the look and feel of the application',
    icon: 'Palette',
  },
  {
    id: 'reading',
    name: 'Reading',
    description: 'Configure your Bible reading experience',
    icon: 'BookOpen',
  },
  {
    id: 'audio',
    name: 'Audio',
    description: 'Text-to-speech and audio playback settings',
    icon: 'Volume2',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Advanced configuration and developer options',
    icon: 'Settings',
  },
] as const

export type SettingsCategory = typeof settingsCategories[number]['id']
