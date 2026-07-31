import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("serves the standalone rental navigation site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>房务通 · 出租屋信息导航<\/title>/);
  assert.match(html, /让房屋管理，更简单有序/);
  assert.match(html, /const NAV_DATA = \[/);
  assert.match(html, /const SEARCH_ENGINES = \[/);
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /aria-controls="sidebar"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("includes all six top-level rental management categories", async () => {
  const response = await render();
  const html = await response.text();

  for (const category of [
    "房源管理",
    "租客管理",
    "合同租约",
    "收租财务",
    "维修报修",
    "系统工具",
  ]) {
    assert.match(html, new RegExp(category));
  }
});
