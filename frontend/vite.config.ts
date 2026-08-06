import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  base: "/bridgeadoption/",
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 5000,
    // Evita cálculo do tamanho comprimido (gzip) de cada chunk, que consome
    // bastante memória/CPU quando há bibliotecas pesadas como plotly.js.
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-plotly": ["plotly.js", "react-plotly.js"],
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-table"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-i18n": ["react-i18next", "i18next", "i18next-browser-languagedetector"],
          "vendor-state": ["zustand"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
});
