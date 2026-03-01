import { getDesktopPlatform, getPlatformDisplayName, getShortcutLabel } from '@/lib/platform'

export function Footer() {
  const platform = getDesktopPlatform()
  const platformLabel = getPlatformDisplayName(platform)
  const searchShortcut = getShortcutLabel('F', platform)

  return (
    <footer className="h-[var(--footer-height)] border-t border-border/70 bg-muted/35">
      <div className="platform-status-text flex h-full items-center justify-between px-[var(--workspace-padding)] text-muted-foreground">
        <span>{platformLabel} mode ready</span>
        <span className="hidden sm:block">
          {searchShortcut} search, right-click verses for study actions.
        </span>
      </div>
    </footer>
  )
}
