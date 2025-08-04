import { useSettings } from './SettingsProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen,
  Scroll,
  Eye,
  Bell,
  History,
  Bookmark,
  FileText,
  Calendar,
  ArrowDown
} from 'lucide-react'

export function ReadingSettings() {
  const { settings, updateSetting } = useSettings()
  const { reading } = settings

  const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </div>
  )

  const SliderSetting = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 1, 
    unit = '', 
    onChange 
  }: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    unit?: string
    onChange: (value: number) => void
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Badge variant="secondary" className="text-xs">
          {value}{unit}
        </Badge>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Default Repository */}
      <SettingGroup title="Default Repository">
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Bible Translation</label>
          <select
            value={reading.defaultRepository || ''}
            onChange={(e) => updateSetting('reading', 'defaultRepository', e.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select a repository...</option>
            {/* TODO: Populate with actual repositories */}
            <option value="kjv-1769">King James Version (1769)</option>
            <option value="esv">English Standard Version</option>
            <option value="niv">New International Version</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Choose which Bible translation to open by default
          </p>
        </div>
      </SettingGroup>

      <Separator />

      {/* Reading Mode */}
      <SettingGroup title="Reading Mode">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={reading.readingMode === 'verse' ? 'default' : 'outline'}
                onClick={() => updateSetting('reading', 'readingMode', 'verse')}
                className="flex-col gap-2 h-auto p-3"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Verse</span>
              </Button>
              <Button
                variant={reading.readingMode === 'paragraph' ? 'default' : 'outline'}
                onClick={() => updateSetting('reading', 'readingMode', 'paragraph')}
                className="flex-col gap-2 h-auto p-3"
              >
                <Scroll className="h-4 w-4" />
                <span className="text-xs">Paragraph</span>
              </Button>
              <Button
                variant={reading.readingMode === 'chapter' ? 'default' : 'outline'}
                onClick={() => updateSetting('reading', 'readingMode', 'chapter')}
                className="flex-col gap-2 h-auto p-3"
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">Chapter</span>
              </Button>
            </div>
          </div>

          {/* Auto Scroll */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              <span className="text-sm font-medium">Auto Scroll</span>
            </div>
            <Button
              variant={reading.autoScroll ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'autoScroll', !reading.autoScroll)}
            >
              {reading.autoScroll ? 'On' : 'Off'}
            </Button>
          </div>

          {reading.autoScroll && (
            <SliderSetting
              label="Scroll Speed"
              value={reading.scrollSpeed}
              min={1}
              max={10}
              onChange={(value) => updateSetting('reading', 'scrollSpeed', value)}
            />
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Display Options */}
      <SettingGroup title="Display Options">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Show Cross References</span>
            </div>
            <Button
              variant={reading.showCrossReferences ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'showCrossReferences', !reading.showCrossReferences)}
            >
              {reading.showCrossReferences ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Show Footnotes</span>
            </div>
            <Button
              variant={reading.showFootnotes ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'showFootnotes', !reading.showFootnotes)}
            >
              {reading.showFootnotes ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </SettingGroup>

      <Separator />

      {/* Reading Plans */}
      <SettingGroup title="Reading Plans">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Enable Reading Plans</span>
            </div>
            <Button
              variant={reading.enableReadingPlans ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'enableReadingPlans', !reading.enableReadingPlans)}
            >
              {reading.enableReadingPlans ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">Daily Reading Reminder</span>
            </div>
            <Button
              variant={reading.dailyReadingReminder ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'dailyReadingReminder', !reading.dailyReadingReminder)}
            >
              {reading.dailyReadingReminder ? 'On' : 'Off'}
            </Button>
          </div>

          {reading.dailyReadingReminder && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reminder Time</label>
              <input
                type="time"
                value={reading.reminderTime}
                onChange={(e) => updateSetting('reading', 'reminderTime', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* History and Bookmarks */}
      <SettingGroup title="History & Bookmarks">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="text-sm font-medium">Track Reading History</span>
            </div>
            <Button
              variant={reading.readingHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'readingHistory', !reading.readingHistory)}
            >
              {reading.readingHistory ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              <span className="text-sm font-medium">Auto-sync Bookmarks</span>
            </div>
            <Button
              variant={reading.bookmarks.autoSync ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('reading', 'bookmarks', {
                ...reading.bookmarks,
                autoSync: !reading.bookmarks.autoSync
              })}
            >
              {reading.bookmarks.autoSync ? 'On' : 'Off'}
            </Button>
          </div>

          <SliderSetting
            label="Maximum Bookmarks"
            value={reading.bookmarks.maxBookmarks}
            min={100}
            max={2000}
            step={100}
            onChange={(value) => updateSetting('reading', 'bookmarks', {
              ...reading.bookmarks,
              maxBookmarks: value
            })}
          />
        </div>
      </SettingGroup>
    </div>
  )
}
