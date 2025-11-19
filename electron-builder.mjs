/* eslint-env node */

import pkg from './package.json' with {type: 'json'};
import mapWorkspaces from '@npmcli/map-workspaces';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export default /** @type import('electron-builder').Configuration */
  ({
    appId: 'io.github.beabzk.zaphnath',
    productName: 'Zaphnath Bible Reader',
    executableName: 'zaphnath',
    copyright: 'Copyright © 2025 Beabfekad Zikie',
    directories: {
      output: 'dist',
      buildResources: 'buildResources',
    },
    generateUpdatesFilesForAllChannels: true,
    compression: 'maximum', // Better compression for Bible data
    npmRebuild: true, // Required for better-sqlite3
    buildDependenciesFromSource: true, // Ensure native modules are built correctly
    mac: {
      category: 'public.app-category.reference',
      target: ['dmg', 'zip'],
      icon: 'buildResources/icon.icns',
      darkModeSupport: true,
      gatekeeperAssess: false,
      hardenedRuntime: false,
    },
    win: {
      target: ['nsis', 'portable'],
      icon: 'buildResources/icon.png',
      verifyUpdateCodeSignature: false,
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'Zaphnath Bible Reader',
      deleteAppDataOnUninstall: false, // Preserve user's Bible data and settings
    },
    linux: {
      target: ['deb', 'AppImage', 'tar.gz'],
      category: 'Education',
      icon: 'buildResources/icon.png',
      description: 'Modern Bible study application',
      maintainer: 'Beabfekad Zikie',
      desktop: {
        entry: {
          Name: 'Zaphnath Bible Reader',
          Comment: 'Modern Bible study application',
          Keywords: 'bible;study;religion;scripture;christian;',
          StartupWMClass: 'zaphnath',
        },
      },
    },
    /**
     * It is recommended to avoid using non-standard characters such as spaces in artifact names,
     * as they can unpredictably change during deployment, making them impossible to locate and download for update.
     */
    artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
    files: [
      'LICENSE*',
      'packages/entry-point.mjs',
      // Include all node_modules except @app workspace packages
      'node_modules/**/*',
      '!node_modules/@app/**',
      // Include ZBRS documentation and schemas
      'docs/schemas/**',
      'docs/standards/**',
      // Exclude development files
      '!**/*.{ts,tsx,map}',
      '!**/tests/**',
      '!**/test/**',
      '!**/*.test.*',
      '!**/*.spec.*',
      '!**/vite.config.*',
      '!**/tsconfig.*',
      '!**/eslint.*',
      '!**/.env*',
      ...await getListOfFilesFromEachWorkspace(),
    ],
  });

/**
 * By default, electron-builder copies each package into the output compilation entirety,
 * including the source code, tests, configuration, assets, and any other files.
 *
 * So you may get compiled app structure like this:
 * ```
 * app/
 * ├── node_modules/
 * │   └── workspace-packages/
 * │       ├── package-a/
 * │       │   ├── src/            # Garbage. May be safely removed
 * │       │   ├── dist/
 * │       │   │   └── index.js    # Runtime code
 * │       │   ├── vite.config.js  # Garbage
 * │       │   ├── .env            # some sensitive config
 * │       │   └── package.json
 * │       ├── package-b/
 * │       ├── package-c/
 * │       └── package-d/
 * ├── packages/
 * │   └── entry-point.js
 * └── package.json
 * ```
 *
 * To prevent this, we read the “files”
 * property from each package's package.json
 * and add all files that do not match the patterns to the exclusion list.
 *
 * This way,
 * each package independently determines which files will be included in the final compilation and which will not.
 *
 * So if `package-a` in its `package.json` describes
 * ```json
 * {
 *   "name": "package-a",
 *   "files": [
 *     "dist/**\/"
 *   ]
 * }
 * ```
 *
 * Then in the compilation only those files and `package.json` will be included:
 * ```
 * app/
 * ├── node_modules/
 * │   └── workspace-packages/
 * │       ├── package-a/
 * │       │   ├── dist/
 * │       │   │   └── index.js    # Runtime code
 * │       │   └── package.json
 * │       ├── package-b/
 * │       ├── package-c/
 * │       └── package-d/
 * ├── packages/
 * │   └── entry-point.js
 * └── package.json
 * ```
 */
async function getListOfFilesFromEachWorkspace() {

  /**
   * @type {Map<string, string>}
   */
  const workspaces = await mapWorkspaces({
    cwd: process.cwd(),
    pkg,
  });

  const allFilesToInclude = [];

  for (const [name, path] of workspaces) {
    const pkgPath = join(path, 'package.json');
    const { default: workspacePkg } = await import(pathToFileURL(pkgPath), { with: { type: 'json' } });

    let patterns = workspacePkg.files || ['dist/**', 'package.json'];

    patterns = patterns.map(p => join('node_modules', name, p));
    allFilesToInclude.push(...patterns);
  }

  return allFilesToInclude;
}
