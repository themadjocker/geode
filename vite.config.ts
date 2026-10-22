import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";

const bundleAnalysisEnabled = process.env.GEODE_BUNDLE_ANALYZE === "1";

export default defineConfig({
  plugins: [
    react(),
    ...(bundleAnalysisEnabled
      ? [
          visualizer({
            filename: ".diagnostics/bundle-analysis.md",
            template: "markdown",
            gzipSize: true,
            brotliSize: true,
            open: false,
            emitFile: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@compat": fileURLToPath(new URL("./src/compat", import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
