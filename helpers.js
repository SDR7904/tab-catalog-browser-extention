// ---------------------------------------------------------------------------
// Pure helpers shared by the popup and Node tests (no browser APIs).
// Loaded via <script> in popup.html; CommonJS export for test/run.js.
// ---------------------------------------------------------------------------

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.TabCatalogHelpers = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Escape text before injecting into HTML text/content contexts. */
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** Escape for use inside a double-quoted HTML attribute. */
  function escapeAttr(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function isSafeHttpUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Best-effort favicon URL.
   * Prefers the browser-cached favIconUrl; optionally falls back to Google's
   * favicon service for http(s) pages only. Non-http schemes return "".
   * @param {object} tab
   * @param {{ allowRemote?: boolean, cache?: Map<string, string> }} [opts]
   */
  function getFaviconUrl(tab, opts) {
    const allowRemote = !opts || opts.allowRemote !== false;
    const cache = opts && opts.cache;

    if (tab.favIconUrl && tab.favIconUrl.startsWith("http")) {
      return tab.favIconUrl;
    }
    if (!allowRemote) return "";

    try {
      const parsed = new URL(tab.url || "");
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "";
      }
      const domain = parsed.hostname;
      if (cache && cache.has(domain)) return cache.get(domain);
      const url =
        "https://www.google.com/s2/favicons?domain=" +
        encodeURIComponent(domain) +
        "&sz=64";
      if (cache) cache.set(domain, url);
      return url;
    } catch {
      return "";
    }
  }

  function sanitizeCell(str) {
    return (str || "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
  }

  function sanitizeLinkText(str) {
    return sanitizeCell(str).replace(/\[/g, "(").replace(/\]/g, ")");
  }

  function tabMatchesFilter(tab, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const title = (tab.title || "").toLowerCase();
    const url = (tab.url || "").toLowerCase();
    return title.includes(q) || url.includes(q);
  }

  function getDomain(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "local";
      }
      return parsed.hostname.replace(/^www\./, "") || "local";
    } catch {
      return "local";
    }
  }

  return {
    escapeHtml,
    escapeAttr,
    isSafeHttpUrl,
    getFaviconUrl,
    sanitizeCell,
    sanitizeLinkText,
    tabMatchesFilter,
    getDomain,
  };
});
