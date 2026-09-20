// ---------------------------------------------------------------------------
// HTML / Markdown export builders (no browser APIs).
// Loaded after helpers.js in the popup; CommonJS for Node smoke tests.
// ---------------------------------------------------------------------------

(function (root, factory) {
  const H =
    typeof module === "object" && module.exports
      ? require("./helpers.js")
      : root.TabCatalogHelpers;
  const api = factory(H);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.TabCatalogExport = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (H) {
  const EXPORT_CSS = `
  :root {
    --amber-400: #fbbf24;
    --amber-500: #f59e0b;
  }
  body { font-family: 'Inter', sans-serif; background: #09090b; }
  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .font-mono { font-family: 'IBM Plex Mono', monospace; }

  .tab-card {
    position: relative;
    display: flex;
    gap: 12px;
    padding: 16px 16px 16px 14px;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 10px;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .tab-card:hover { border-color: #3f3f46; transform: translateY(-1px); }
  .tab-card.is-hidden { display: none; }

  .tab-card-flag {
    flex: 0 0 auto;
    width: 30px;
    height: 22px;
    border-radius: 6px;
    background: rgba(251,191,36,0.12);
    color: var(--amber-400);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-card-body { min-width: 0; flex: 1; }

  .tab-card-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #71717a;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  .tab-card-eyebrow img.favicon { width: 12px; height: 12px; border-radius: 2px; }
  .tab-card-eyebrow .pin-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(251,191,36,0.12);
    color: var(--amber-400);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .tab-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #f4f4f5;
    margin: 0 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tab-card-url {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #71717a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
  }
  .tab-card-url:hover { color: var(--amber-400); }
  span.tab-card-url { cursor: default; }

  .copy-btn {
    flex: 0 0 auto;
    align-self: flex-start;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid #27272a;
    background: transparent;
    color: #71717a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .copy-btn:hover { background: #27272a; color: #fbbf24; }
  .copy-btn:focus-visible { outline: 2px solid #fbbf24; outline-offset: 2px; }
  .copy-btn.copied { color: #34d399; border-color: #34d399; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
`;

  const EXPORT_SCRIPT = `
    const filterInput = document.getElementById('filter-input');
    const cards = Array.from(document.querySelectorAll('.tab-card'));
    const emptyState = document.getElementById('empty-state');

    function runFilter() {
      const q = filterInput.value.trim().toLowerCase();
      let visibleCount = 0;
      cards.forEach(card => {
        const match = card.dataset.search.includes(q);
        card.classList.toggle('is-hidden', !match);
        if (match) visibleCount++;
      });
      emptyState.classList.toggle('hidden', visibleCount !== 0);
    }

    filterInput.addEventListener('input', runFilter);

    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        filterInput.focus();
        filterInput.select();
      }
      if (e.key === 'Escape' && document.activeElement === filterInput) {
        filterInput.value = '';
        runFilter();
        filterInput.blur();
      }
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
        } catch (err) {
          fallbackCopy(btn.dataset.copy);
        }
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1200);
      });
    });

    document.getElementById('copy-all-btn').addEventListener('click', async () => {
      const lines = Array.from(document.querySelectorAll('.tab-card:not(.is-hidden)')).map(card => {
        const title = card.querySelector('.tab-card-title').textContent.trim();
        const url = card.querySelector('.tab-card-url').textContent.trim();
        return title + ' — ' + url;
      });
      const text = lines.join('\\n');
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        fallbackCopy(text);
      }
      const label = document.getElementById('copy-all-label');
      label.textContent = 'Copied ✓';
      setTimeout(() => { label.textContent = 'Copy all'; }, 1600);
    });

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
`;

  /**
   * @param {Array} tabs
   * @param {{ iconDataUri?: string|null, favicon?: { allowRemote?: boolean, cache?: Map } }} [options]
   */
  function buildExportHTML(tabs, options) {
    const opts = options || {};
    const iconDataUri = opts.iconDataUri || null;
    const faviconOpts = opts.favicon || {};

    const now = new Date();
    const exportedAt = now.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const cards = tabs
      .map((tab, i) => {
        const rawTitle = tab.title || tab.url || "Untitled";
        const rawUrl = tab.url || "";
        const title = H.escapeHtml(rawTitle);
        const urlText = H.escapeHtml(rawUrl);
        const favicon = H.getFaviconUrl(tab, faviconOpts);
        const index = String(i + 1).padStart(2, "0");
        const domain = H.getDomain(rawUrl);
        const searchAttr = H.escapeAttr(`${rawTitle} ${rawUrl}`.toLowerCase());
        const copyAttr = H.escapeAttr(`${rawTitle} — ${rawUrl}`);
        const pinBadge = tab.pinned
          ? `<span class="pin-badge">Pinned</span>`
          : "";

        const favHtml = favicon
          ? `<img src="${H.escapeAttr(favicon)}" alt="" class="favicon" loading="lazy" onerror="this.style.visibility='hidden'" />`
          : `<span class="favicon" style="display:inline-block;width:12px;height:12px"></span>`;

        let urlHtml;
        if (H.isSafeHttpUrl(rawUrl)) {
          urlHtml = `<a class="tab-card-url" href="${H.escapeAttr(rawUrl)}" target="_blank" rel="noopener noreferrer">${urlText}</a>`;
        } else {
          urlHtml = `<span class="tab-card-url">${urlText}</span>`;
        }

        return `
        <article class="tab-card" data-search="${searchAttr}">
          <div class="tab-card-flag">${index}</div>
          <div class="tab-card-body">
            <div class="tab-card-eyebrow">
              ${favHtml}
              <span>${H.escapeHtml(domain)}</span>
              ${pinBadge}
            </div>
            <h3 class="tab-card-title">${title}</h3>
            ${urlHtml}
          </div>
          <button class="copy-btn" data-copy="${copyAttr}" title="Copy title and URL">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </article>`;
      })
      .join("\n");

    const logoImg = iconDataUri
      ? `<img src="${iconDataUri}" alt="Tab Catalog" class="w-full h-full object-contain" />`
      : `T`;

    const faviconTag = iconDataUri
      ? `<link rel="icon" type="image/png" href="${iconDataUri}" />`
      : "";

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Tab Catalog — ${tabs.length} tabs</title>
${faviconTag}
<script src="https://cdn.tailwindcss.com"><\/script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
${EXPORT_CSS}
</style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen">

  <div class="max-w-6xl mx-auto px-6 py-12">

    <header class="flex flex-col gap-6 mb-10 pb-8 border-b border-zinc-800">
      <div class="flex items-start justify-between flex-wrap gap-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 font-display font-bold text-xl flex items-center justify-center flex-shrink-0 overflow-hidden text-amber-400">${logoImg}</div>
          <div>
            <h1 class="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-zinc-50">Tab Catalog</h1>
            <p class="font-mono text-xs text-zinc-500 mt-1">Exported ${H.escapeHtml(exportedAt)}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="font-mono text-xs px-3 py-1.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
            ${tabs.length} tab${tabs.length !== 1 ? "s" : ""}
          </span>
          <button id="copy-all-btn" class="font-mono text-xs px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-600 transition-colors flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span id="copy-all-label">Copy all</span>
          </button>
        </div>
      </div>

      <div class="relative">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          id="filter-input"
          type="text"
          placeholder="Filter by title or URL… (/ to focus, Esc to clear)"
          class="w-full sm:w-80 bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 font-mono"
        />
      </div>
    </header>

    <main id="card-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cards}
    </main>

    <p id="empty-state" class="hidden text-center text-zinc-500 text-sm font-mono py-16">No tabs match your filter.</p>

    <footer class="mt-14 pt-6 border-t border-zinc-800 text-center">
      <p class="font-mono text-xs text-zinc-600">Generated by Tab Catalog · a snapshot of ${tabs.length} open tab${tabs.length !== 1 ? "s" : ""}</p>
    </footer>
  </div>

  <script>
${EXPORT_SCRIPT}
  <\/script>

</body>
</html>`;
  }

  /**
   * @param {Array} tabs
   * @param {{ favicon?: { allowRemote?: boolean, cache?: Map } }} [options]
   */
  function buildExportMarkdown(tabs, options) {
    const faviconOpts = (options && options.favicon) || {};

    const now = new Date();
    const exportedAt = now.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const rows = tabs
      .map((tab, i) => {
        const index = String(i + 1).padStart(2, "0");
        const title = H.sanitizeLinkText(tab.title || tab.url || "Untitled");
        const rawUrl = tab.url || "";
        const url = rawUrl.replace(/\)/g, "%29").replace(/\(/g, "%28");
        const favicon = H.getFaviconUrl(tab, faviconOpts);
        const domain = H.getDomain(rawUrl);
        const pin = tab.pinned ? " pinned" : "";
        const favCell = favicon ? `![](${favicon})` : "";
        const link = H.isSafeHttpUrl(rawUrl) ? `[${title}](${url})` : title;
        return `| ${index} | ${favCell} | ${link}${pin} | \`${H.sanitizeCell(domain)}\` |`;
      })
      .join("\n");

    return `# Tab Catalog

_Exported ${exportedAt}_
**${tabs.length} tab${tabs.length !== 1 ? "s" : ""}**

| # | | Title | Domain |
|---|---|-------|--------|
${rows}

---
Generated by [Tab Catalog](https://github.com/SDR7904/tab-catalog-browser-extention) · a snapshot of ${tabs.length} open tab${tabs.length !== 1 ? "s" : ""}
`;
  }

  return {
    EXPORT_CSS,
    EXPORT_SCRIPT,
    buildExportHTML,
    buildExportMarkdown,
  };
});
