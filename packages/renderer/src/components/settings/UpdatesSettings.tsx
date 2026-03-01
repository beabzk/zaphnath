import { useSettings } from './SettingsProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Info, RefreshCw } from 'lucide-react'

export function UpdatesSettings() {
  const { settings, updateSetting } = useSettings()
  const { updatePolicy } = settings.advanced

  const updatePolicies: Array<{
    value: typeof updatePolicy
    name: string
    description: string
  }> = [
    {
      value: 'auto',
      name: 'Auto update',
      description: 'Automatically check, download, and install updates when closing the app.',
    },
    {
      value: 'notify',
      name: 'Check and notify',
      description: 'Automatically check for updates and notify you when one is available.',
    },
    {
      value: 'manual',
      name: 'Manual only',
      description: 'Do not automatically check for updates.',
    },
  ]

  const currentPolicy = updatePolicies.find((policy) => policy.value === updatePolicy)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Update Behavior</h3>
          <Badge variant="secondary" className="text-xs">
            {currentPolicy?.name ?? updatePolicy}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {updatePolicies.map((policy) => (
            <Button
              key={policy.value}
              variant={updatePolicy === policy.value ? 'default' : 'outline'}
              onClick={() => updateSetting('advanced', 'updatePolicy', policy.value)}
              className="h-auto flex-col items-start gap-1 p-3 text-left"
            >
              <span className="text-xs font-medium">{policy.name}</span>
              <span className="text-xs text-muted-foreground whitespace-normal">
                {policy.description}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Update policy is applied immediately and synced with the desktop updater.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border p-3">
        <div className="flex items-start gap-2">
          <Download className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Manual update checks</p>
            <p className="text-xs text-muted-foreground mt-1">
              Manual checks are controlled by your selected policy and release channel.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Check for updates
          </Button>
        </div>
      </div>
    </div>
  )
}
