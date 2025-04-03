// vite.config.tauri.js
import { defineConfig, mergeConfig } from "vite";
import baseViteConfig from "./vite.config";
import tauri from "vite-plugin-tauri";

export default defineConfig(async (env) => {
  // Await the base config function to get a plain object
  const baseConfigObject = await baseViteConfig(env);
  return mergeConfig(baseConfigObject, {
    plugins: [tauri()],
    clearScreen: false,
    server: {
      open: false,
    },
  });
});
