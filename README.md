# Tab Catalog

> Export your open browser tabs as a beautiful, searchable, self-contained HTML catalog.

Tab Catalog is a lightweight browser extension that captures every open tab in your current browser window and generates a polished HTML document that you can save, share, archive, or revisit anytime. The exported file is completely self-contained and works offline in any modern web browser.

---

## ✨ Features

- 📑 Capture every open tab from the current browser window
- 🎨 Modern and responsive user interface
- 📄 Export as a standalone HTML file
- 🔍 Search tabs by title or URL
- 🌐 Display website favicons automatically
- 📋 Copy individual tab information
- 📋 Copy all tabs with a single click
- 🌙 Beautiful dark theme
- ⚡ No external dependencies after export
- 📱 Responsive layout for desktop and mobile browsers

---

## Demo

The exported catalog includes:

- Clean card-based layout
- Responsive design
- Search functionality
- Clickable URLs
- Domain indicators
- Favicon support
- Copy-to-clipboard buttons
- Export timestamp
- Total tab counter

---

## Installation

### Chrome / Chromium

1. Clone or download this repository.

```bash
git clone https://github.com/SDR7904/tab-catalog-browser-extention.git
```

2. Open your browser and navigate to:

```
chrome://extensions
```

3. Enable **Developer mode**.

4. Click **Load unpacked**.

5. Select the project folder.

> **📦 Release:** Alternatively, you can download the latest release as a ZIP file (**[tab-catalog-v.1.1.0](https://github.com/SDR7904/tab-catalog-browser-extention/blob/main/tab-catalog-v.1.1.0.zip)**) and import it directly into your browser.

The extension is now ready to use.

---

## Usage

1. Open several browser tabs.
2. Click the **Tab Catalog** extension icon.
3. Review the detected tabs.
4. Click **Download as HTML**.
5. Save the generated file.
6. Open the exported HTML in any browser.

---

## Project Structure

```
tab-catalog-browser-extention/
│
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
└── README.md
```

---

## Technologies

- Manifest V3
- Vanilla JavaScript
- HTML5
- CSS3
- Tailwind CSS
- Google Fonts
- Chrome Tabs API

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Read all open tabs in the current browser window |

---

## Exported HTML

Each exported catalog is completely self-contained and includes:

- Embedded styling
- Responsive layout
- Search functionality
- Copy buttons
- Dark theme
- Favicons
- Metadata
- Clickable links

No installation or extension is required to open the exported file.

---

## Browser Support

- Google Chrome
- Microsoft Edge
- Brave
- Opera
- Any Chromium-based browser supporting Manifest V3

---

## Roadmap

- [ ] Export all browser windows
- [ ] Export as Markdown
- [ ] Export as JSON
- [ ] Export as CSV
- [ ] Tab grouping
- [ ] Sorting options
- [ ] Custom themes
- [ ] Light mode
- [ ] Bookmark import
- [ ] Session history support

---

## Contributing

Contributions, ideas, feature requests, and bug reports are always welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a Pull Request.

---

## License

This project is released under the **MIT License**.

---

## Author

Developed with ❤️ by **SDR7904**
