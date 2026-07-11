import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/dashboard-app/",
  build: {
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? "assets/dashboard.css"
            : "assets/[name][extname]",
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/dashboard.js",
        manualChunks: (id) => {
          if (/node_modules\/\.pnpm\/(react|react-dom|scheduler)@/.test(id)) {
            return "react-runtime";
          }

          if (/node_modules\/\.pnpm\/(convex|@convex-dev\+better-auth|better-auth)@/.test(id)) {
            return "data-runtime";
          }

          return undefined;
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5180,
  },
});
