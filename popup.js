// ---------------------------------------------------------------------------
// Tab Catalog -- popup.js
// Popup UI: query tabs, selection/filter, download.
// Pure helpers: helpers.js. Export builders: export-builders.js.
// ---------------------------------------------------------------------------

const browserAPI = typeof browser !== "undefined" ? browser : chrome;
const H = TabCatalogHelpers;

const listEl = document.getElementById("tab-list");
const countEl = document.getElementById("tab-count");
const downloadBtn = document.getElementById("download-btn");
const downloadLabel = document.getElementById("download-label");
const formatHtmlBtn = document.getElementById("format-html");
const formatMdBtn = document.getElementById("format-md");
const filterInput = document.getElementById("filter-input");
const selectAllBtn = document.getElementById("select-all");
const selectNoneBtn = document.getElementById("select-none");
const selectedCountEl = document.getElementById("selected-count");
const allWindowsCb = document.getElementById("all-windows");
const remoteFaviconsCb = document.getElementById("remote-favicons");

let currentTabs = [];
let selectedIds = new Set();
let exportFormat = "html"; // "html" | "md"
let iconDataUri = null;
const faviconCache = new Map();

function makePinEl(pinned) {
  if (pinned) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "tab-pin");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("title", "Pinned");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
    );
    svg.appendChild(path);
    return svg;
  }
  const spacer = document.createElement("span");
  spacer.className = "tab-pin";
  spacer.hidden = true;
  spacer.style.cssText = "width:14px;flex:0 0 auto";
  return spacer;
}

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
  } catch {
    return null;
  }
}

function faviconOpts() {
  return {
    allowRemote: remoteFaviconsCb.checked,
    cache: faviconCache,
  };
}

function getSelectedTabs() {
  return currentTabs.filter((t) => selectedIds.has(t.id));
}

function updateCountLabels() {
  const n = currentTabs.length;
  const scope = allWindowsCb.checked ? "across windows" : "open";
  countEl.textContent = `${n} tab${n !== 1 ? "s" : ""} ${scope}`;

  const selected = getSelectedTabs().length;
  selectedCountEl.textContent =
    selected === n ? `${selected} selected` : `${selected} of ${n} selected`;
  downloadBtn.disabled = selected === 0;
}

function applyFilter() {
  const q = filterInput.value;
  const rows = listEl.querySelectorAll(".tab-row");
  let visible = 0;
  rows.forEach((row) => {
    const id = Number(row.dataset.tabId);
    const tab = currentTabs.find((t) => t.id === id);
    const match = tab ? H.tabMatchesFilter(tab, q) : false;
    row.hidden = !match;
    if (match) visible++;
  });

  let empty = listEl.querySelector(".tab-list-empty");
  if (currentTabs.length === 0) {
    // empty state already shown by renderTabs
  } else if (visible === 0) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "tab-list-empty";
      empty.dataset.filterEmpty = "1";
      listEl.appendChild(empty);
    }
    empty.textContent = "No tabs match your filter.";
    empty.hidden = false;
  } else if (empty && empty.dataset.filterEmpty) {
    empty.remove();
  }
}

function renderTabs(tabs) {
  listEl.innerHTML = "";

  if (tabs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tab-list-empty";
    empty.textContent = "No open tabs found.";
    listEl.appendChild(empty);
    updateCountLabels();
    return;
  }

  const frag = document.createDocumentFragment();
  const opts = faviconOpts();

  tabs.forEach((tab, i) => {
    const title = tab.title || tab.url || "Untitled";
    const url = tab.url || "";
    const checked = selectedIds.has(tab.id);

    const row = document.createElement("div");
    row.className = "tab-row" + (checked ? "" : " is-deselected");
    row.dataset.tabId = String(tab.id);

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "tab-check";
    check.checked = checked;
    check.setAttribute("aria-label", `Include ${title}`);
    check.addEventListener("click", (e) => e.stopPropagation());
    check.addEventListener("change", () => {
      if (check.checked) selectedIds.add(tab.id);
      else selectedIds.delete(tab.id);
      row.classList.toggle("is-deselected", !check.checked);
      updateCountLabels();
    });

    const index = document.createElement("span");
    index.className = "tab-index";
    index.textContent = String(i + 1).padStart(2, "0");

    const favicon = document.createElement("img");
    favicon.className = "tab-favicon";
    favicon.alt = "";
    favicon.loading = "lazy";
    const favUrl = H.getFaviconUrl(tab, opts);
    if (favUrl) {
      favicon.src = favUrl;
      favicon.onerror = () => favicon.classList.add("is-missing");
    } else {
      favicon.classList.add("is-missing");
    }

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

    row.appendChild(check);
    row.appendChild(makePinEl(!!tab.pinned));
    row.appendChild(index);
    row.appendChild(favicon);
    row.appendChild(meta);

    row.addEventListener("click", (e) => {
      if (e.target === check) return;
      check.checked = !check.checked;
      check.dispatchEvent(new Event("change"));
    });

    frag.appendChild(row);
  });

  listEl.appendChild(frag);
  updateCountLabels();
  applyFilter();
}

async function loadTabs() {
  const query = allWindowsCb.checked ? {} : { currentWindow: true };
  const tabs = await browserAPI.tabs.query(query);
  currentTabs = tabs;
  selectedIds = new Set(tabs.map((t) => t.id));
  renderTabs(tabs);
}

async function init() {
  try {
    const [, icon] = await Promise.all([loadTabs(), loadIconDataUri()]);
    iconDataUri = icon;
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
  formatHtmlBtn.setAttribute("aria-pressed", format === "html" ? "true" : "false");
  formatMdBtn.setAttribute("aria-pressed", format === "md" ? "true" : "false");
  downloadLabel.textContent =
    format === "html" ? "Download as HTML" : "Download as Markdown";
}

formatHtmlBtn.addEventListener("click", () => setExportFormat("html"));
formatMdBtn.addEventListener("click", () => setExportFormat("md"));

filterInput.addEventListener("input", applyFilter);

selectAllBtn.addEventListener("click", () => {
  const q = filterInput.value;
  currentTabs.forEach((t) => {
    if (H.tabMatchesFilter(t, q)) selectedIds.add(t.id);
  });
  renderTabs(currentTabs);
});

selectNoneBtn.addEventListener("click", () => {
  const q = filterInput.value;
  currentTabs.forEach((t) => {
    if (H.tabMatchesFilter(t, q)) selectedIds.delete(t.id);
  });
  renderTabs(currentTabs);
});

allWindowsCb.addEventListener("change", () => {
  loadTabs().catch((err) => {
    countEl.textContent = "Could not read tabs";
    console.error(err);
  });
});

remoteFaviconsCb.addEventListener("change", () => {
  renderTabs(currentTabs);
});

downloadBtn.addEventListener("click", () => {
  const tabs = getSelectedTabs();
  if (tabs.length === 0) return;

  const dateStr = new Date().toISOString().slice(0, 10);
  let content, mimeType, filename, idleLabel;

  if (exportFormat === "html") {
    content = TabCatalogExport.buildExportHTML(tabs, {
      iconDataUri,
      favicon: faviconOpts(),
    });
    mimeType = "text/html";
    filename = `tab-catalog-${dateStr}.html`;
    idleLabel = "Download as HTML";
  } else {
    content = TabCatalogExport.buildExportMarkdown(tabs, {
      favicon: faviconOpts(),
    });
    mimeType = "text/markdown";
    filename = `tab-catalog-${dateStr}.md`;
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

  downloadLabel.textContent = "Downloaded OK";
  setTimeout(() => {
    downloadLabel.textContent = idleLabel;
  }, 1600);
});

init();
