import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = path.join(projectRoot, "dist-static");
const ocrSource = path.join(projectRoot, "public", "ocr");
const ocrOutput = path.join(outputRoot, "ocr");

const requiredOcrFiles = [
  "mnist-12.onnx",
  "NOTICE.txt",
  "ort.min.js",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm.chunk1.bin",
  "ort-wasm.chunk2.bin",
  "ort-wasm.chunk3.bin",
  "ort-wasm.chunk4.bin",
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(ocrOutput, { recursive: true });
await copyFile(path.join(projectRoot, "index.html"), path.join(outputRoot, "index.html"));

const availableOcrFiles = new Set(await readdir(ocrSource));
for (const fileName of requiredOcrFiles) {
  if (!availableOcrFiles.has(fileName)) {
    throw new Error(`缺少静态识别资源：${fileName}`);
  }
  await copyFile(path.join(ocrSource, fileName), path.join(ocrOutput, fileName));
}

const outputFiles = [
  path.join(outputRoot, "index.html"),
  ...requiredOcrFiles.map((fileName) => path.join(ocrOutput, fileName)),
];
const sizes = await Promise.all(outputFiles.map((filePath) => stat(filePath)));
const totalBytes = sizes.reduce((total, file) => total + file.size, 0);

console.log(
  `腾讯云静态包已生成：${outputFiles.length} 个文件，${(
    totalBytes /
    1024 /
    1024
  ).toFixed(2)} MB`,
);
