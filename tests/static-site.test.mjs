import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const staticRoot = path.join(projectRoot, "dist-static");

test("builds a standalone static mirror with all OCR resources", async () => {
  const sourceHtml = await readFile(path.join(projectRoot, "index.html"), "utf8");
  const staticHtml = await readFile(path.join(staticRoot, "index.html"), "utf8");
  assert.equal(staticHtml, sourceHtml);

  for (const fileName of [
    "mnist-12.onnx",
    "NOTICE.txt",
    "ort.min.js",
    "ort-wasm-simd-threaded.mjs",
    "ort-wasm.chunk1.bin",
    "ort-wasm.chunk2.bin",
    "ort-wasm.chunk3.bin",
    "ort-wasm.chunk4.bin",
  ]) {
    const source = await stat(path.join(projectRoot, "public", "ocr", fileName));
    const output = await stat(path.join(staticRoot, "ocr", fileName));
    assert.equal(output.size, source.size, `${fileName} should be copied completely`);
  }
});

test("uses root-hosted OCR paths and includes mirror migration guidance", async () => {
  const html = await readFile(path.join(staticRoot, "index.html"), "utf8");
  assert.match(html, /script\.src = location\.protocol === "file:" \? "\.\/public\/ocr\/ort\.min\.js" : "\/ocr\/ort\.min\.js"/);
  assert.match(html, /tcloudbaseapp\\\.com/);
  assert.match(html, /app\\\.tcloudbase\\\.com/);
  assert.match(html, /这是手机备用访问地址/);
  assert.match(html, /go-backup-migration/);
  assert.match(html, /fangwutong\.mobile-mirror-tip\.v1/);
});
