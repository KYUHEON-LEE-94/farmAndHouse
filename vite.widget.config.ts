import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "widget"),
  publicDir: path.resolve(__dirname, "public"),
  base: "./",
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "widget-dist"),
    emptyOutDir: true,
  },
});
