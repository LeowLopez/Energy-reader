import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const packageInfo = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const serviceWorkerPath = join(dist, "service-worker.js");
const serviceWorker = await readFile(serviceWorkerPath, "utf8");
if (!serviceWorker.includes("__APP_VERSION__")) {
  throw new Error("O placeholder de versão do service worker não foi encontrado.");
}
await writeFile(serviceWorkerPath, serviceWorker.replaceAll("__APP_VERSION__", packageInfo.version));
await writeFile(join(dist, "version.json"), `${JSON.stringify({ version: packageInfo.version }, null, 2)}\n`);
