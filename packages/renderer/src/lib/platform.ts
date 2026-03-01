export type DesktopPlatform = 'windows' | 'macos' | 'linux' | 'unknown';

function normalizePlatform(value: string): DesktopPlatform {
  const source = value.toLowerCase();

  if (source.includes('mac') || source.includes('darwin')) {
    return 'macos';
  }

  if (source.includes('win')) {
    return 'windows';
  }

  if (source.includes('linux') || source.includes('x11')) {
    return 'linux';
  }

  return 'unknown';
}

export function getDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const navWithUserAgentData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  const userAgentPlatform = navWithUserAgentData.userAgentData?.platform;
  if (userAgentPlatform) {
    return normalizePlatform(userAgentPlatform);
  }

  if (navigator.platform) {
    return normalizePlatform(navigator.platform);
  }

  return normalizePlatform(navigator.userAgent || '');
}

export function getPlatformDisplayName(platform: DesktopPlatform = getDesktopPlatform()): string {
  switch (platform) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Desktop';
  }
}

export function getPlatformModifierKey(
  platform: DesktopPlatform = getDesktopPlatform()
): 'Ctrl' | 'Cmd' {
  return platform === 'macos' ? 'Cmd' : 'Ctrl';
}

export function getShortcutLabel(
  key: string,
  platform: DesktopPlatform = getDesktopPlatform()
): string {
  return `${getPlatformModifierKey(platform)}+${key.toUpperCase()}`;
}
