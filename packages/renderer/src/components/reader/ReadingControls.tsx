import { useState } from 'react'
import { Type, AlignLeft, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ReadingPreferences {
  fontFamily: string
  fontSize: number
  lineHeight: number
  textAlign: 'left' | 'justify'
  verseNumbers: boolean
  verseSpacing: number
  maxWidth: number
}

const FONT_FAMILIES = [
  { name: 'System', value: 'system-ui' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
]

const PRESETS = {
  reading: {
    name: 'Reading',
    fontFamily: 'Georgia, serif',
    fontSize: 16,
    lineHeight: 1.8,
    textAlign: 'left' as const,
    verseNumbers: true,
    verseSpacing: 4,
    maxWidth: 768,
  },
  study: {
    name: 'Study',
    fontFamily: 'system-ui',
    fontSize: 15,
    lineHeight: 1.6,
    textAlign: 'left' as const,
    verseNumbers: true,
    verseSpacing: 2,
    maxWidth: 896,
  },
  presentation: {
    name: 'Presentation',
    fontFamily: 'Arial, sans-serif',
    fontSize: 20,
    lineHeight: 2,
    textAlign: 'justify' as const,
    verseNumbers: false,
    verseSpacing: 6,
    maxWidth: 1024,
  },
}

interface ReadingControlsProps {
  preferences: ReadingPreferences
  onChange: (preferences: ReadingPreferences) => void
}

export function ReadingControls({ preferences, onChange }: ReadingControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handlePresetChange = (preset: keyof typeof PRESETS) => {
    onChange(PRESETS[preset])
  }

  const handleReset = () => {
    onChange(PRESETS.reading)
  }

  const adjustFontSize = (delta: number) => {
    onChange({
      ...preferences,
      fontSize: Math.max(12, Math.min(28, preferences.fontSize + delta)),
    })
  }

  return (
    <div className="border-b border-border">
      {/* Quick Controls Bar */}
      <div className="px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          {/* Font Size Controls */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <button
              onClick={() => adjustFontSize(-1)}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="Decrease font size"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm min-w-[3ch] text-center">{preferences.fontSize}</span>
            <button
              onClick={() => adjustFontSize(1)}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="Increase font size"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetChange(key as keyof typeof PRESETS)}
                className={`px-3 py-1 text-xs transition-colors ${
                  JSON.stringify(preferences) === JSON.stringify(preset)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-xs hover:bg-accent transition-colors"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {/* Font Family */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Type className="w-4 h-4" />
                Font Family
              </label>
              <select
                value={preferences.fontFamily}
                onChange={(e) => onChange({ ...preferences, fontFamily: e.target.value })}
                className="w-full px-2 py-1 bg-background border border-border text-sm"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Height */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <AlignLeft className="w-4 h-4" />
                Line Height
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={preferences.lineHeight}
                  onChange={(e) =>
                    onChange({ ...preferences, lineHeight: parseFloat(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">{preferences.lineHeight.toFixed(1)}</span>
              </div>
            </div>

            {/* Verse Spacing */}
            <div>
              <label className="text-sm font-medium mb-2 block">Verse Spacing</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={preferences.verseSpacing}
                  onChange={(e) =>
                    onChange({ ...preferences, verseSpacing: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">{preferences.verseSpacing}px</span>
              </div>
            </div>

            {/* Max Width */}
            <div>
              <label className="text-sm font-medium mb-2 block">Reading Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="640"
                  max="1280"
                  step="64"
                  value={preferences.maxWidth}
                  onChange={(e) =>
                    onChange({ ...preferences, maxWidth: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm w-16 text-right">{preferences.maxWidth}px</span>
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <label className="text-sm font-medium mb-2 block">Text Alignment</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onChange({ ...preferences, textAlign: 'left' })}
                  className={`flex-1 px-3 py-1 text-xs transition-colors ${
                    preferences.textAlign === 'left'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:bg-accent'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => onChange({ ...preferences, textAlign: 'justify' })}
                  className={`flex-1 px-3 py-1 text-xs transition-colors ${
                    preferences.textAlign === 'justify'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:bg-accent'
                  }`}
                >
                  Justify
                </button>
              </div>
            </div>

            {/* Show Verse Numbers */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Eye className="w-4 h-4" />
                Show Verse Numbers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={preferences.verseNumbers}
                  onChange={(e) => onChange({ ...preferences, verseNumbers: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Display verse numbers</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type { ReadingPreferences }
export { PRESETS }
