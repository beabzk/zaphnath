/**
 * Version Management Utilities
 * 
 * This module provides utilities for working with application version information.
 * The version is automatically injected from package.json during build time.
 */

/**
 * Get the current application version
 * @returns The current version string (e.g., "0.1.0")
 */
export function getAppVersion(): string {
  return __APP_VERSION__;
}

/**
 * Get the current application version with 'v' prefix
 * @returns The current version string with 'v' prefix (e.g., "v0.1.0")
 */
export function getAppVersionWithPrefix(): string {
  return `v${__APP_VERSION__}`;
}

/**
 * Parse version string into semantic version components
 * @param version - Version string to parse (e.g., "0.1.0")
 * @returns Object with major, minor, and patch version numbers
 */
export function parseVersion(version: string = __APP_VERSION__): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
  const match = version.match(versionRegex);
  
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  const [, major, minor, patch, prerelease] = match;
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    ...(prerelease && { prerelease }),
  };
}

/**
 * Compare two version strings
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  if (v1.major !== v2.major) {
    return v1.major > v2.major ? 1 : -1;
  }
  
  if (v1.minor !== v2.minor) {
    return v1.minor > v2.minor ? 1 : -1;
  }
  
  if (v1.patch !== v2.patch) {
    return v1.patch > v2.patch ? 1 : -1;
  }
  
  // Handle prerelease versions
  if (v1.prerelease && !v2.prerelease) return -1;
  if (!v1.prerelease && v2.prerelease) return 1;
  if (v1.prerelease && v2.prerelease) {
    return v1.prerelease.localeCompare(v2.prerelease);
  }
  
  return 0;
}

/**
 * Check if the current version is a prerelease version
 * @returns True if the current version is a prerelease
 */
export function isPrerelease(): boolean {
  const version = parseVersion();
  return !!version.prerelease;
}

/**
 * Get version information for display in the UI
 * @returns Object with formatted version information
 */
export function getVersionInfo() {
  const version = parseVersion();
  const isPrerel = isPrerelease();
  
  return {
    version: getAppVersion(),
    versionWithPrefix: getAppVersionWithPrefix(),
    major: version.major,
    minor: version.minor,
    patch: version.patch,
    prerelease: version.prerelease,
    isPrerelease: isPrerel,
    displayName: isPrerel 
      ? `${getAppVersionWithPrefix()} (${version.prerelease})`
      : getAppVersionWithPrefix(),
  };
}
