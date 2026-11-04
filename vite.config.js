import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Energy-reader/" : "/",
  build: {
    manifest: "build-manifest.json",
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        tutorial: resolve(process.cwd(), "tutorial.html"),
      },
    },
  },
});
