import * as exports from './index.js';
import {contextBridge} from 'electron';

const isExport = (key: string): key is keyof typeof exports => Object.hasOwn(exports, key);

for (const exportsKey in exports) {
  if (isExport(exportsKey)) {
    // TODO: consolidate preload exposure so we don't need dual names long-term
    // Expose with base64-encoded name for backward compatibility
    contextBridge.exposeInMainWorld(btoa(exportsKey), exports[exportsKey]);
    // Also expose with regular name for new code
    contextBridge.exposeInMainWorld(exportsKey, exports[exportsKey]);
  }
}

// Re-export for tests
export * from './index.js';
