"use strict";

const assert = require("assert");
const {
  escapeHtml,
  escapeAttr,
  isSafeHttpUrl,
  getFaviconUrl,
  sanitizeCell,
  sanitizeLinkText,
  tabMatchesFilter,
  getDomain,
} = require("../helpers.js");
const {
  buildExportHTML,
  buildExportMarkdown,
  EXPORT_CSS,
  EXPORT_SCRIPT,
} = require("../export-builders.js");

// --- helpers ---

assert.strictEqual(escapeHtml('<script>"x"</script>'), '&lt;script&gt;"x"&lt;/script&gt;');
assert.strictEqual(escapeHtml("a & b"), "a &amp; b");
assert.strictEqual(escapeHtml(null), "");

assert.ok(escapeAttr('hello"onclick=alert(1)').includes("&quot;"));
assert.ok(!escapeAttr('x" y').includes('"'));
assert.strictEqual(escapeAttr("a&b"), "a&amp;b");

assert.strictEqual(isSafeHttpUrl("https://example.com/a"), true);
assert.strictEqual(isSafeHttpUrl("http://example.com"), true);
assert.strictEqual(isSafeHttpUrl("javascript:alert(1)"), false);
assert.strictEqual(isSafeHttpUrl("data:text/html,hi"), false);
assert.strictEqual(isSafeHttpUrl("chrome://extensions"), false);

assert.strictEqual(
  getFaviconUrl({ favIconUrl: "https://cdn.example/f.ico", url: "https://example.com" }),
  "https://cdn.example/f.ico"
);
assert.ok(getFaviconUrl({ url: "https://github.com/foo" }).includes("google.com/s2/favicons"));
assert.strictEqual(getFaviconUrl({ url: "chrome://extensions" }), "");
assert.strictEqual(getFaviconUrl({ url: "https://example.com" }, { allowRemote: false }), "");

const cache = new Map();
assert.strictEqual(
  getFaviconUrl({ url: "https://a.example/x" }, { cache }),
  getFaviconUrl({ url: "https://a.example/y" }, { cache })
);

assert.strictEqual(sanitizeCell("a|b\nc"), "a\\|b c");
assert.strictEqual(sanitizeLinkText("foo[bar]"), "foo(bar)");
assert.strictEqual(tabMatchesFilter({ title: "GitHub", url: "https://github.com" }, "git"), true);
assert.strictEqual(tabMatchesFilter({ title: "GitHub", url: "https://github.com" }, "zzz"), false);
assert.strictEqual(getDomain("https://www.example.com/path"), "example.com");
assert.strictEqual(getDomain("chrome://extensions"), "local");

// --- export smoke ---

assert.ok(EXPORT_CSS.includes(".tab-card"));
assert.ok(EXPORT_SCRIPT.includes("filterInput"));
assert.ok(EXPORT_SCRIPT.includes("Escape"));

const sampleTabs = [
  {
    title: 'Hello "World" & <Friends>',
    url: "https://example.com/path?q=1",
    pinned: true,
  },
  {
    title: "Dangerous",
    url: "javascript:alert(1)",
  },
  {
    title: "Internal",
    url: "chrome://extensions",
  },
];

const html = buildExportHTML(sampleTabs, {
  iconDataUri: null,
  favicon: { allowRemote: true },
});

assert.ok(html.startsWith("<!DOCTYPE html>"));
assert.ok(html.includes("Tab Catalog — 3 tabs") || html.includes("3 tabs"));
assert.ok(html.includes("&quot;"), "quotes in attributes must be escaped");
assert.ok(!html.includes('data-copy="Hello "World"'), "attribute breakout");
assert.ok(html.includes('href="https://example.com/path?q=1"'));
assert.ok(!html.includes('href="javascript:'));
assert.ok(html.includes("javascript:alert(1)"));
assert.ok(html.includes("pin-badge"));
assert.ok(html.includes("--amber-400"));
assert.ok(html.includes("keydown"));
assert.ok(/<\/script>\s*<\/body>/i.test(html), "document must close script then body");

const md = buildExportMarkdown(sampleTabs, { favicon: { allowRemote: false } });
assert.ok(md.startsWith("# Tab Catalog"));
assert.ok(md.includes("**3 tabs**"));
assert.ok(md.includes("https://example.com"));
assert.ok(!md.includes("](javascript:"));
assert.ok(md.includes("Dangerous"));
assert.ok(md.includes(" pinned"));
assert.ok(md.includes("`local`"));
assert.ok(!md.includes("google.com/s2/favicons"));

console.log("All helper + export smoke tests passed.");
