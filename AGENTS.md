# AGENTS.md

## Project overview

This repo contains a **pure client-side web app** that helps rug tufters estimate:

- Yarn length per color
- Yarn weight per color (including wastage)
- Yarn cost per color and for the whole project

The user:

1. Uploads an image of their rug design.
2. Sets parameters (rug size, density, pile type/height, yarn specs, strands count, wastage, etc.).
3. The app:
   - Analyzes the image, clusters similar colors (with a tolerance).
   - Ignores transparent / nearly-transparent pixels.
   - Computes area per color, then yarn length, weight, and cost.
   - Shows a color table, overlays on the image, an info panel with explanations.
   - Supports CSV + PDF export.
   - Has a consent banner and optional ads.

The app is meant to be:

- **Static** (no backend), hosted on GitHub Pages or Vercel.
- **Beginner-friendly** (default presets) but **advanced-capable** (all formulas visible and tweakable).
- **Respectful of privacy** (everything runs in the browser).

---

## Tech stack and constraints

- HTML + CSS + **vanilla JavaScript** (ES6 modules). Optional TypeScript in the future, but keep the build simple.
- No framework (no React/Vue/etc.) unless a human explicitly approves a migration.
- All computation should stay **client-side**:
  - Image processing (color clustering, overlays, hover readout).
  - Yarn quantity & cost calculations.
  - PDF and CSV export.
- No backend services, databases, or auth.
- OK to use **small browser libraries via `<script>` CDN** if really needed (e.g. `jsPDF`, color math helpers), but:
  - Prefer a single, well-known CDN per library.
  - Avoid huge bundles or UI frameworks.

---

## Project structure

The project is a single-page app, roughly like this:

- `index.html`  
  - Main layout, steps, and forms:
    - Image upload & preview
    - Project settings (rug size, aspect lock)
    - Pile & density settings (beginner/advanced modes)
    - Yarn settings (strands, weight/m or m/kg, wastage, price per kg OR skein price+weight)
    - Results (color table, legend, overlay controls, summary, export buttons)
  - Consent banner and a small “Consent” button in the footer.
  - Script tags for:
    - `jsPDF` + `jspdf-autotable`
    - `app.js` (module)

- `styles.css`  
  - Global layout, flex/grid, typography.
  - Step cards, buttons (primary/secondary), tooltips/infoboxes.
  - Table styling for results, selection highlighting rows.
  - Preview container, overlays, legend, hover readout tooltip.
  - Consent banner and basic ad-slot styling.

- `app.js`  
  - Main controller:
    - DOM lookups, event listeners, and state.
    - File upload & image load into a `<canvas>` (`previewCanvas`).
    - Calls to image analysis + clustering (could be in helper modules or inline).
    - Overlay logic:
      - Modes: none / highlight / isolate / hide.
      - Selection via table rows, legend chips, and clicks inside the preview canvas.
      - Hover highlighting (dim non-hovered clusters when no selection is active).
      - Hover readout showing hex + color name + % of valid pixels.
    - Yarn calculations:
      - Read rug + density + yarn parameters from form.
      - Compute per-color yarn length/weight (single strand → all strands).
      - Apply wastage.
      - Compute cost per color and total if price info is provided.
    - Cost calculator behavior:
      - Accepts either:
        - price per kg, OR
        - skein weight + skein price → derive €/kg.
    - Results rendering:
      - Color table with swatch, % of valid pixels, area, yarn (m), weight (g incl. wastage), cost (€).
      - Legend with clickable color chips (sync with table + overlay).
      - Summary panel with totals and explanations.
    - Exports:
      - CSV export (per-color rows + totals row).
      - PDF export using `jsPDF` + `autoTable`:
        - Thumbnail of the preview image.
        - Parameters block (including yarn cost).
        - Totals (area, length, weight, cost).
        - Per-color table with color swatch squares instead of text hex in the swatch column.
    - Manual palette editing:
      - Rename color (per hex) → stored in `colorNames` map.
      - Merge colors: sum pixel counts, area, length, weight, and cost for merged rows; update selection, legend, overlay, and summary.
    - Consent & ads:
      - LocalStorage-based consent (`CONSENT_KEY`).
      - “Allow ads” / “Continue without ads” banner.
      - Only load AdSense script after consent is granted.
      - “Consent” button to reopen the banner.

- Optionally, helper modules such as:
  - `calculation.js` – pure functions for yarn geometry & unit conversions.
  - `imageProcessing.js` – color clustering, area rescaling, etc.

If these helper modules do not yet exist and you need to refactor code out of `app.js`, prefer **small, pure functions** that are easy to test.

---

## Setup commands

This is a **static site**; no build step is required.

Use one of the following for local development:

- Quick local server using Node (if available):

  ```bash
  npm install -g serve
  serve .
  ```

* Or with `npx` (no global install):

  ```bash
  npx serve .
  ```

Then open the provided URL (usually `http://localhost:3000` or `http://localhost:5000`).

There is currently **no test suite**; testing is manual via the browser.

---

## Behavior expectations for agents

* **Do not introduce a backend** or persistent user accounts without explicit human instruction.
* Keep the app **usable offline** once assets are cached (PWA is allowed but optional).
* Preserve all existing behavior:

  * Cost calculator.
  * CSV + PDF exports.
  * Hover readout + hover highlight.
  * Color selection via table, legend, and preview canvas.
  * Consent banner & ad loading logic.
* Maintain **accessibility** where reasonable:

  * Keep proper labels for inputs.
  * Preserve keyboard focusability for interactive elements.
  * Do not hide key information only in hover tooltips.

When refactoring:

* Prefer **small, incremental changes** over large restructurings.
* Keep `app.js` readable: avoid deeply nested callbacks; prefer named functions.
* Avoid adding heavy dependencies. If a library is really helpful, explain why in comments.

---

## Code style and conventions

* JavaScript: ES6 modules, `const`/`let`, no `var`.
* Use **descriptive variable names**; avoid one-letter variables except for short loops where obvious.
* Functions should be small and focused; complex logic should be extracted into helpers.
* Prefer **pure functions** for math / data transformations (e.g. color clustering, yarn calculations).
* Comments:

  * Add comments for non-obvious math (e.g., length per cm², cost calculation).
  * Document assumptions (e.g., that area is proportional to pixel count after scaling).

Formatting guidelines:

* Indent with **2 spaces**.
* Use semicolons consistently (either always or never; keep consistent with existing file).
* For HTML/CSS, keep lines reasonably short and use meaningful class names.

---

## Testing & manual checks

There is no automated test harness yet. Before considering a feature “done”, perform at least:

1. **Image workflow**

   * Upload a PNG with transparency: verify transparent pixels are ignored.
   * Upload a JPG: verify it still works.
   * Try a large image (e.g. 2000×2000) and confirm UI remains responsive.

2. **Rug size & aspect ratio**

   * Toggle “Keep image proportions” on/off.
   * Change width and height and confirm the aspect is preserved when lock is on.

3. **Yarn & cost**

   * Use only price per kg → verify per-color cost and total cost are non-zero.
   * Use only skein weight + skein price → verify derived €/kg and totals.
   * Set no price → verify costs are blank and no “~X €” appears in summary.

4. **Merging & renaming colors**

   * Rename a single color → check both table and legend update.
   * Merge 2–3 colors:

     * Check that area, length, weight, and cost in the merged row equal the sum.
     * Check total area/length/weight/cost in summary and exports.

5. **Overlay & hover**

   * Click rows, legend, and preview canvas → selection syncs everywhere.
   * Overlay modes:

     * `None`, `Highlight`, `Isolate`, `Hide` behave as described.
   * Hover:

     * When no selection and overlay = none, hovering dims other colors.
     * Hover readout shows hex + optional name + % of valid pixels.

6. **Exports**

   * CSV:

     * Open in a spreadsheet; columns include color, percent, area, length, weight, cost, and pixels.
     * Totals row at bottom includes summed area/length/weight/cost.
   * PDF:

     * Confirm thumbnail, parameter block, totals (including cost), and table with swatches.
     * No JS errors in console during export.

7. **Consent & ads**

   * With no prior consent, banner appears.
   * “Allow ads” loads the ad script once; “Continue without ads” does not.
   * “Consent” button re-opens the banner.

If you introduce new features, add a small bullet list here explaining new checks.

---

## Security, privacy, and UX constraints

* **Do NOT send user images or parameters to external services** (no remote APIs) unless a human explicitly requests an integration.
* Avoid adding third-party analytics trackers.
* Ads:

  * Only load ad scripts after explicit user consent.
  * If ad loading fails, fail gracefully (fallback placeholder).
* Do not store sensitive information. The only persistent data should be:

  * Non-sensitive settings (e.g. last used parameters, lock-aspect toggle, maybe consent choice).
  * Store these in `localStorage` or similar.

---

## Future improvements (backlog for agents)

If a human asks “what should we add next?”, these are good candidates:

1. Better **error handling** and user messaging around image analysis and PDF/CSV generation.
2. Optional **per-color overrides** (different yarn types / strands).
3. Simplified **“preset wizard”** for typical rug sizes and yarn types.
4. Optional **PWA** so it works well on a tablet near the tufting frame.
5. Automated tests for pure functions in any calculation module (if we introduce a simple test harness).

When working on new features, keep **backward compatibility** where possible and do not silently remove existing functionality.