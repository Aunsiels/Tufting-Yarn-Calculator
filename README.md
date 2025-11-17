# Tufting Yarn Calculator (Web App)

A small, fully client-side web app to help rug tufters estimate:

- Yarn length per color
- Yarn weight per color (including wastage)
- Yarn cost per color and for the whole rug

Upload your design image, enter rug size and yarn parameters, and get a detailed breakdown per color, plus CSV/PDF exports.

---

## Features

- 🎨 **Image-based color analysis**
  - Upload PNG/JPG.
  - Cluster similar colors with a tolerance slider.
  - Ignore transparent pixels.
  - Per-color area and % of valid pixels.

- 🧶 **Yarn estimation**
  - Beginner and advanced density modes.
  - Pile type & height.
  - Yarn thickness using g/m or m/kg.
  - Metric (EU) or Imperial (US) unit systems, including € / $ cost inputs.
  - Strands count, wastage factor.
  - Cost calculation:
    - Either price per kg,
    - Or skein weight + skein price → derived €/kg.
  - Per-color and total length, weight, and cost.

- 👀 **Interactive visualization**
  - Overlay modes: none / highlight / isolate / hide.
  - Hover readout on the preview (hex + name + % of valid pixels).
  - Selection via table, legend, and clicks on the image.
  - Manual color renaming and merging.

- 📤 **Exports**
  - CSV export for spreadsheets.
  - PDF export with:
    - Preview thumbnail
    - Parameters summary
    - Totals (area, length, weight, cost)
    - Per-color table with color swatches.

- 🔒 **Privacy & consent**
  - All calculations happen in the browser.
  - Optional ads behind an explicit consent banner.

---

## Getting started

No build step required.

1. Clone the repository:

   ```bash
   git clone <your-repo-url>.git
   cd <your-repo-folder>
   ```

2. Start a simple local web server (recommended):

   ```bash
   npm install -g serve
   serve .
   ```

   or:

   ```bash
   npx serve .
   ```

3. Open the URL provided by `serve` (e.g. `http://localhost:3000`) in your browser.

You can also open `index.html` directly in a browser, but some features (like PDF export) may behave more reliably with a local server.

---

## Development notes

* Stack: HTML, CSS, vanilla JavaScript (ES modules).
* No backend, no bundler is required.
* If you want to contribute with AI agents, see `AGENTS.md` for project-specific guidance.
