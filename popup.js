// ---------------------------------------------------------------------------
// Tab Catalog — popup.js
// Reads all tabs in the current window, renders them in the popup, and
// builds a self-contained, Tailwind-styled HTML file for download.
// ---------------------------------------------------------------------------

// Firefox implements the native, promise-based `browser` namespace; Chrome
// uses `chrome`, which is also promise-based in Manifest V3 when no callback
// is passed. Prefer `browser` when it exists so this runs natively in
// Firefox rather than through its `chrome` compatibility shim.
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const listEl = document.getElementById("tab-list");
const countEl = document.getElementById("tab-count");
const downloadBtn = document.getElementById("download-btn");
const downloadLabel = document.getElementById("download-label");
const formatHtmlBtn = document.getElementById("format-html");
const formatMdBtn = document.getElementById("format-md");

let currentTabs = [];
let exportFormat = "html"; // "html" | "md"
let iconDataUri = null; // base64 data: URI for icons/icon128.png, loaded once at startup

/**
 * Reads the extension's own bundled icon and converts it to a base64 data URI.
 * This is a chrome-extension:// fetch (bundled resource, not a network request),
 * so it's fast and doesn't touch the popup's load time. We need the data URI
 * (rather than a relative path like "icons/icon128.png") so the *exported*
 * HTML file — a standalone document with no access to the extension's files —
 * still shows the icon after being downloaded and opened elsewhere.
 */
async function loadIconDataUri() {
  try {
    const res = await fetch(browserAPI.runtime.getURL("icons/icon128.png"));
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null; // Exports still work fine without the embedded icon.
  }
}

/** Escape text before injecting into innerHTML. */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/** Best-effort favicon: prefer Chrome's cached favIconUrl, else Google's favicon service. */
function getFaviconUrl(tab) {
  if (tab.favIconUrl && tab.favIconUrl.startsWith("http")) {
    return tab.favIconUrl;
  }
  try {
    const domain = new URL(tab.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (err) {
    // Internal pages like chrome://extensions have no meaningful domain.
    return "https://www.google.com/s2/favicons?domain=&sz=64";
  }
}

function renderTabs(tabs) {
  listEl.innerHTML = "";

  if (tabs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tab-list-empty";
    empty.textContent = "No open tabs found.";
    listEl.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();

  tabs.forEach((tab, i) => {
    const title = tab.title || tab.url || "Untitled";
    const url = tab.url || "";

    const row = document.createElement("div");
    row.className = "tab-row";

    const index = document.createElement("span");
    index.className = "tab-index";
    index.textContent = String(i + 1).padStart(2, "0");

    const favicon = document.createElement("img");
    favicon.className = "tab-favicon";
    favicon.src = getFaviconUrl(tab);
    favicon.alt = "";

    const meta = document.createElement("div");
    meta.className = "tab-meta";

    const titleEl = document.createElement("p");
    titleEl.className = "tab-title";
    titleEl.title = title;
    titleEl.textContent = title;

    const urlEl = document.createElement("p");
    urlEl.className = "tab-url";
    urlEl.title = url;
    urlEl.textContent = url;

    meta.appendChild(titleEl);
    meta.appendChild(urlEl);
    row.appendChild(index);
    row.appendChild(favicon);
    row.appendChild(meta);
    frag.appendChild(row);
  });

  listEl.appendChild(frag);
}

async function init() {
  try {
    // Run in parallel: querying tabs and reading the bundled icon are both
    // fast, local operations, and doing them together (rather than one
    // after another) shaves a little more off time-to-first-render.
    const [tabs, icon] = await Promise.all([
      browserAPI.tabs.query({ currentWindow: true }),
      loadIconDataUri(),
    ]);
    currentTabs = tabs;
    iconDataUri = icon;
    countEl.textContent = `${tabs.length} tab${tabs.length !== 1 ? "s" : ""} open`;
    renderTabs(tabs);
    downloadBtn.disabled = tabs.length === 0;
  } catch (err) {
    countEl.textContent = "Could not read tabs";
    listEl.innerHTML = "";
    const errDiv = document.createElement("div");
    errDiv.className = "tab-list-empty";
    errDiv.textContent = err.message;
    listEl.appendChild(errDiv);
  }
}

function setExportFormat(format) {
  exportFormat = format;
  formatHtmlBtn.classList.toggle("active", format === "html");
  formatMdBtn.classList.toggle("active", format === "md");
  downloadLabel.textContent = format === "html" ? "Download as HTML" : "Download as Markdown";
}

formatHtmlBtn.addEventListener("click", () => setExportFormat("html"));
formatMdBtn.addEventListener("click", () => setExportFormat("md"));

downloadBtn.addEventListener("click", () => {
  const dateStr = new Date().toISOString().slice(0, 10);
  let content, mimeType, filename, doneLabel, idleLabel;

  if (exportFormat === "html") {
    content = buildExportHTML(currentTabs);
    mimeType = "text/html";
    filename = `tab-catalog-${dateStr}.html`;
    doneLabel = "Downloaded ✓";
    idleLabel = "Download as HTML";
  } else {
    content = buildExportMarkdown(currentTabs);
    mimeType = "text/markdown";
    filename = `tab-catalog-${dateStr}.md`;
    doneLabel = "Downloaded ✓";
    idleLabel = "Download as Markdown";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 4000);

  downloadLabel.textContent = doneLabel;
  setTimeout(() => {
    downloadLabel.textContent = idleLabel;
  }, 1600);
});

/**
 * Builds the full, self-contained HTML document that gets downloaded.
 * Uses the Tailwind CDN — fine here because this file is opened as a
 * normal web page, not run inside the extension's CSP-restricted popup.
 */
function buildExportHTML(tabs) {
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
      const title = escapeHtml(tab.title || tab.url || "Untitled");
      const url = escapeHtml(tab.url || "");
      const favicon = getFaviconUrl(tab);
      const index = String(i + 1).padStart(2, "0");
      let domain = "";
      try {
        domain = new URL(tab.url).hostname.replace(/^www\./, "");
      } catch (err) {
        domain = "local";
      }

      return `
        <article class="tab-card" data-search="${title.toLowerCase()} ${url.toLowerCase()}">
          <div class="tab-card-flag">${index}</div>
          <div class="tab-card-body">
            <div class="tab-card-eyebrow">
              <img src="${favicon}" alt="" class="favicon" onerror="this.style.visibility='hidden'" />
              <span>${escapeHtml(domain)}</span>
            </div>
            <h3 class="tab-card-title">${title}</h3>
            <a class="tab-card-url" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
          </div>
          <button class="copy-btn" data-copy="${title} — ${url}" title="Copy title and URL">
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
    : `T`; // graceful fallback if the icon couldn't be read

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
  .copy-btn.copied { color: #34d399; border-color: #34d399; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
</style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen">

  <div class="max-w-6xl mx-auto px-6 py-12">

    <!-- Header -->
    <header class="flex flex-col gap-6 mb-10 pb-8 border-b border-zinc-800">
      <div class="flex items-start justify-between flex-wrap gap-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 font-display font-bold text-xl flex items-center justify-center flex-shrink-0 overflow-hidden text-amber-400">${logoImg}</div>
          <div>
            <h1 class="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-zinc-50">Tab Catalog</h1>
            <p class="font-mono text-xs text-zinc-500 mt-1">Exported ${escapeHtml(exportedAt)}</p>
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
          placeholder="Filter by title or URL…"
          class="w-full sm:w-80 bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 font-mono"
        />
      </div>
    </header>

    <!-- Cards -->
    <main id="card-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cards}
    </main>

    <p id="empty-state" class="hidden text-center text-zinc-500 text-sm font-mono py-16">No tabs match your filter.</p>

    <footer class="mt-14 pt-6 border-t border-zinc-800 text-center">
      <p class="font-mono text-xs text-zinc-600">Generated by Tab Catalog · a snapshot of ${tabs.length} open tab${tabs.length !== 1 ? "s" : ""}</p>
    </footer>
  </div>

  <script>
    // Filter cards by title/URL
    const filterInput = document.getElementById('filter-input');
    const cards = Array.from(document.querySelectorAll('.tab-card'));
    const emptyState = document.getElementById('empty-state');

    filterInput.addEventListener('input', () => {
      const q = filterInput.value.trim().toLowerCase();
      let visibleCount = 0;
      cards.forEach(card => {
        const match = card.dataset.search.includes(q);
        card.classList.toggle('is-hidden', !match);
        if (match) visibleCount++;
      });
      emptyState.classList.toggle('hidden', visibleCount !== 0);
    });

    // Copy a single card's title + URL
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

    // Copy every tab as "Title — URL" lines
    document.getElementById('copy-all-btn').addEventListener('click', async () => {
      const lines = Array.from(document.querySelectorAll('.tab-card')).map(card => {
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

    // Fallback for contexts where the async Clipboard API is blocked (e.g. some file:// views)
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
  <\/script>

</body>
</html>`;
}

/**
 * Builds a clean, GitHub-renderable Markdown export: a header with counts/
 * timestamp, then a table of favicon / title (linked) / domain per tab.
 * Plain text, no escaping needed for HTML — Markdown link syntax handles
 * titles/URLs safely as long as we guard against literal `]` `)` `|` chars
 * that would break table cells or link syntax.
 */
function buildExportMarkdown(tabs) {
  const now = new Date();
  const exportedAt = now.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sanitizeCell = (str) =>
    (str || "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

  const sanitizeLinkText = (str) =>
    sanitizeCell(str).replace(/\[/g, "(").replace(/\]/g, ")");

  const rows = tabs
    .map((tab, i) => {
      const index = String(i + 1).padStart(2, "0");
      const title = sanitizeLinkText(tab.title || tab.url || "Untitled");
      const url = (tab.url || "").replace(/\)/g, "%29").replace(/\(/g, "%28");
      const favicon = getFaviconUrl(tab);
      let domain = "local";
      try {
        domain = new URL(tab.url).hostname.replace(/^www\./, "");
      } catch (err) {
        /* keep "local" for chrome:// etc. */
      }
      return `| ${index} | ![](${favicon}) | [${title}](${url}) | \`${sanitizeCell(domain)}\` |`;
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

init();
