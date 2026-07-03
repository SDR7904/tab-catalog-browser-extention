// ---------------------------------------------------------------------------
// Tab Catalog — popup.js
// Reads all tabs in the current window, renders them in the popup, and
// builds a self-contained, Tailwind-styled HTML file for download.
// ---------------------------------------------------------------------------

const listEl = document.getElementById("tab-list");
const countEl = document.getElementById("tab-count");
const downloadBtn = document.getElementById("download-btn");
const downloadLabel = document.getElementById("download-label");

let currentTabs = [];

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
    listEl.innerHTML = `<div class="tab-list-empty">No open tabs found.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  tabs.forEach((tab, i) => {
    const row = document.createElement("div");
    row.className = "tab-row";

    const title = tab.title || tab.url || "Untitled";
    const url = tab.url || "";

    row.innerHTML = `
      <span class="tab-index">${String(i + 1).padStart(2, "0")}</span>
      <img class="tab-favicon" src="${getFaviconUrl(tab)}" alt="" />
      <div class="tab-meta">
        <p class="tab-title" title="${escapeHtml(title)}">${escapeHtml(title)}</p>
        <p class="tab-url" title="${escapeHtml(url)}">${escapeHtml(url)}</p>
      </div>
    `;

    frag.appendChild(row);
  });

  listEl.appendChild(frag);
}

async function init() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    currentTabs = tabs;
    countEl.textContent = `${tabs.length} tab${tabs.length !== 1 ? "s" : ""} open`;
    renderTabs(tabs);
    downloadBtn.disabled = tabs.length === 0;
  } catch (err) {
    countEl.textContent = "Could not read tabs";
    listEl.innerHTML = `<div class="tab-list-empty">${escapeHtml(err.message)}</div>`;
  }
}

downloadBtn.addEventListener("click", () => {
  const html = buildExportHTML(currentTabs);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const stamp = new Date();
  const dateStr = stamp.toISOString().slice(0, 10);

  const a = document.createElement("a");
  a.href = url;
  a.download = `tab-catalog-${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 4000);

  downloadLabel.textContent = "Downloaded ✓";
  setTimeout(() => {
    downloadLabel.textContent = "Download as HTML";
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

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Tab Catalog — ${tabs.length} tabs</title>
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
          <div class="w-12 h-12 rounded-xl bg-amber-400 text-zinc-950 font-display font-bold text-xl flex items-center justify-center flex-shrink-0">T</div>
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
      <p class="font-mono text-xs text-zinc-600">Generated by Tab Catalog - Developed by SDR7904 · a snapshot of ${tabs.length} open tab${tabs.length !== 1 ? "s" : ""}</p>
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

init();
