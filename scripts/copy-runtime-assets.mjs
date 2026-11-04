import { mkdir, readdir, copyFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(root, "public");
const tessdataRoot = join(publicRoot, "tessdata");
const tesseractRoot = join(publicRoot, "tesseract");

await mkdir(tessdataRoot, { recursive: true });
await mkdir(tesseractRoot, { recursive: true });

for (const language of ["eng", "por"]) {
  const packageRoot = join(root, "node_modules", "@tesseract.js-data", language);
  const trainedData = await findFile(packageRoot, `${language}.traineddata.gz`);
  if (!trainedData) throw new Error(`Não foi encontrado o modelo OCR de idioma "${language}".`);
  await copyFile(trainedData, join(tessdataRoot, `${language}.traineddata.gz`));
}

const workerSource = join(root, "node_modules", "tesseract.js", "dist", "worker.min.js");
await copyFile(workerSource, join(tesseractRoot, "worker.min.js"));

const coreSource = join(root, "node_modules", "tesseract.js-core");
const coreDist = join(coreSource, "tesseract-core-simd-lstm.wasm.js");
const coreWasm = join(coreSource, "tesseract-core-simd-lstm.wasm");
await copyFile(coreDist, join(tesseractRoot, "tesseract-core-simd-lstm.wasm.js"));
await copyFile(coreWasm, join(tesseractRoot, "tesseract-core-simd-lstm.wasm"));

async function findFile(directory, expectedName) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const result = await findFile(fullPath, expectedName);
      if (result) return result;
    } else if (entry.name === expectedName) {
      return fullPath;
    }
  }
  return null;
}
