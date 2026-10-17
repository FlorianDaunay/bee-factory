import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import pkg from "./package.json";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom", "react-router-dom", "zustand"] } } },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
