import { useSettings } from './SettingsProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Volume2,
  Play,
  Pause,
  Download,
  WifiOff,
  HighlighterIcon as Highlight
} from 'lucide-react'

export function AudioSettings() {
  const { settings, updateSetting } = useSettings()
  const { audio } = settings

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
    step = 0.1, 
    unit = '', 
    onChange,
    disabled = false
  }: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    unit?: string
    onChange: (value: number) => void
    disabled?: boolean
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : ''}`}>
          {label}
        </label>
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
        disabled={disabled}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Audio Enable/Disable */}
      <SettingGroup title="Audio Features">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="text-sm font-medium">Enable Audio Features</span>
          </div>
          <Button
            variant={audio.enabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateSetting('audio', 'enabled', !audio.enabled)}
          >
            {audio.enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
        {!audio.enabled && (
          <p className="text-xs text-muted-foreground">
            Enable audio features to access text-to-speech and audio playback options
          </p>
        )}
      </SettingGroup>

      <Separator />

      {/* Text-to-Speech Settings */}
      <SettingGroup title="Text-to-Speech">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className={`text-sm font-medium ${!audio.enabled ? 'text-muted-foreground' : ''}`}>
              Voice
            </label>
            <select
              value={audio.defaultVoice}
              onChange={(e) => updateSetting('audio', 'defaultVoice', e.target.value)}
              disabled={!audio.enabled}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="system">System Default</option>
              <option value="male-1">Male Voice 1</option>
              <option value="male-2">Male Voice 2</option>
              <option value="female-1">Female Voice 1</option>
              <option value="female-2">Female Voice 2</option>
            </select>
          </div>

          <SliderSetting
            label="Speech Rate"
            value={audio.speechRate}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="x"
            onChange={(value) => updateSetting('audio', 'speechRate', value)}
            disabled={!audio.enabled}
          />

          <SliderSetting
            label="Speech Pitch"
            value={audio.speechPitch}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="x"
            onChange={(value) => updateSetting('audio', 'speechPitch', value)}
            disabled={!audio.enabled}
          />

          <SliderSetting
            label="Volume"
            value={audio.speechVolume}
            min={0.0}
            max={1.0}
            step={0.1}
            unit=""
            onChange={(value) => updateSetting('audio', 'speechVolume', value)}
            disabled={!audio.enabled}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Playback Settings */}
      <SettingGroup title="Playback">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              <span className={`text-sm font-medium ${!audio.enabled ? 'text-muted-foreground' : ''}`}>
                Auto-play on Chapter Load
              </span>
            </div>
            <Button
              variant={audio.autoPlay ? 'default' : 'outline'}
              size="sm"
              disabled={!audio.enabled}
              onClick={() => updateSetting('audio', 'autoPlay', !audio.autoPlay)}
            >
              {audio.autoPlay ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Highlight className="h-4 w-4" />
              <span className={`text-sm font-medium ${!audio.enabled ? 'text-muted-foreground' : ''}`}>
                Highlight Spoken Text
              </span>
            </div>
            <Button
              variant={audio.highlightSpokenText ? 'default' : 'outline'}
              size="sm"
              disabled={!audio.enabled}
              onClick={() => updateSetting('audio', 'highlightSpokenText', !audio.highlightSpokenText)}
            >
              {audio.highlightSpokenText ? 'On' : 'Off'}
            </Button>
          </div>

          <SliderSetting
            label="Pause Between Verses"
            value={audio.pauseBetweenVerses}
            min={0}
            max={3000}
            step={100}
            unit="ms"
            onChange={(value) => updateSetting('audio', 'pauseBetweenVerses', value)}
            disabled={!audio.enabled}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Download Settings */}
      <SettingGroup title="Audio Downloads">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className={`text-sm font-medium ${!audio.enabled ? 'text-muted-foreground' : ''}`}>
              Download Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={audio.downloadQuality === 'low' ? 'default' : 'outline'}
                onClick={() => updateSetting('audio', 'downloadQuality', 'low')}
                disabled={!audio.enabled}
                className="flex-col gap-2 h-auto p-3"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs">Low</span>
                <span className="text-xs text-muted-foreground">64kbps</span>
              </Button>
              <Button
                variant={audio.downloadQuality === 'medium' ? 'default' : 'outline'}
                onClick={() => updateSetting('audio', 'downloadQuality', 'medium')}
                disabled={!audio.enabled}
                className="flex-col gap-2 h-auto p-3"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs">Medium</span>
                <span className="text-xs text-muted-foreground">128kbps</span>
              </Button>
              <Button
                variant={audio.downloadQuality === 'high' ? 'default' : 'outline'}
                onClick={() => updateSetting('audio', 'downloadQuality', 'high')}
                disabled={!audio.enabled}
                className="flex-col gap-2 h-auto p-3"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs">High</span>
                <span className="text-xs text-muted-foreground">320kbps</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className={`text-sm font-medium ${!audio.enabled ? 'text-muted-foreground' : ''}`}>
                Offline Mode
              </span>
            </div>
            <Button
              variant={audio.offlineMode ? 'default' : 'outline'}
              size="sm"
              disabled={!audio.enabled}
              onClick={() => updateSetting('audio', 'offlineMode', !audio.offlineMode)}
            >
              {audio.offlineMode ? 'On' : 'Off'}
            </Button>
          </div>
          
          {audio.offlineMode && (
            <p className="text-xs text-muted-foreground">
              Offline mode will download audio files for offline playback
            </p>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Audio Test */}
      <SettingGroup title="Test Audio">
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm mb-3">
              "In the beginning was the Word, and the Word was with God, and the Word was God." - John 1:1
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                disabled={!audio.enabled}
                onClick={() => {
                  // TODO: Implement audio test
                  console.log('Testing audio with current settings')
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Test Audio
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!audio.enabled}
                onClick={() => {
                  // TODO: Implement audio stop
                  console.log('Stopping audio test')
                }}
              >
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}
