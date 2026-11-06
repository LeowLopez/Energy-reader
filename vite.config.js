import { defineConfig } from "vite";
import { resolve } from "node:path";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : "/",
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
