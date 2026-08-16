import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/apps/web/retail-ms-interface',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: '../../../dist/apps/web/retail-ms-interface',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 4200,
    strictPort: true,
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/ollama/, ''),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@retail": path.resolve(__dirname, "src"),
    },
  },
});
