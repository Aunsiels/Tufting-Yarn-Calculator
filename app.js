import { analyzeImage } from "./imageProcessing.js";
import { computeYarnConstants, computeYarnForClusters } from "./calculation.js";
import { loadLastSettings, saveLastSettings, clearLastSettings,
         loadPresets, savePreset, deletePreset } from "./storage.js";

document.addEventListener("DOMContentLoaded", () => {
  // Panels & outputs
  const analyzeButton = document.getElementById("analyze-button");
  const imageInput = document.getElementById("image-input");
  const colorTolerance = document.getElementById("color-tolerance");
  const colorToleranceValue = document.getElementById("color-tolerance-value");
  const previewCanvas = document.getElementById("preview-canvas");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  const resultsSummary = document.getElementById("results-summary");
  const resultsColors = document.getElementById("results-colors");

  // Mode
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const advancedFields = document.querySelectorAll(".advanced-only");

  // Project inputs
  const rugWidthEl = document.getElementById("rug-width");
  const rugHeightEl = document.getElementById("rug-height");
  const pileTypeEl = document.getElementById("pile-type");
  const pileHeightEl = document.getElementById("pile-height");
  const densityPresetEl = document.getElementById("density-preset");
  const linesPerCmEl = document.getElementById("lines-per-cm");
  const stitchesPerCmEl = document.getElementById("stitches-per-cm");

  // Yarn inputs
  const yarnNameEl = document.getElementById("yarn-name");
  const yarnStrandsEl = document.getElementById("yarn-strands");
  const yarnGPerMEl = document.getElementById("yarn-g-per-m");
  const yarnMPerKgEl = document.getElementById("yarn-m-per-kg");
  const wastagePercentEl = document.getElementById("wastage-percent");

  // Analysis inputs
  const alphaThresholdEl = document.getElementById("alpha-threshold");
  const minAreaPercentEl = document.getElementById("min-area-percent");

  // Persistence UI
  const rememberEl = document.getElementById("remember-settings");
  const presetNameEl = document.getElementById("preset-name");
  const savePresetBtn = document.getElementById("save-preset-button");
  const presetSelectEl = document.getElementById("preset-select");
  const deletePresetBtn = document.getElementById("delete-preset-button");

  let appState = {
    mode: "beginner",
    imageLoaded: false,
    imageNatural: { w: 0, h: 0 },
  };
  // Holds the latest computed color rows for interaction (rename/merge/export)
  let lastPerColor = [];
  // Track user selection of color indices (by their order in lastPerColor)
  let selectedColorIdxs = new Set();
  // Optional user-given names for colors (persist only for this session)
  let colorNames = new Map(); // key: hex string, value: name

  /* --------------------------- UI Mode handling --------------------------- */
  function setMode(mode) {
    appState.mode = mode;
    advancedFields.forEach((el) => {
      el.style.display = mode === "advanced" ? "flex" : "none";
    });
  }
  modeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) setMode(e.target.value);
      maybeAutosave();
    });
  });

  /* ------------------------------ Image load ----------------------------- */
  imageInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        appState.imageNatural = { w: img.width, h: img.height };

        const ctx = previewCanvas.getContext("2d");
        const maxWidth = 600, maxHeight = 400;
        let width = img.width, height = img.height;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        previewCanvas.width = width;
        previewCanvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        previewCanvas.style.display = "block";
        previewPlaceholder.style.display = "none";

        appState.imageLoaded = true;
        analyzeButton.disabled = false;

        resultsSummary.innerHTML = "<p>Ready to analyze. Click “Analyze image”.</p>";
        resultsColors.innerHTML = "";
      };
      img.src = loadEvent.target.result;
    };
    reader.readAsDataURL(file);
  });

  /* ------------------------ Controls minor behavior ---------------------- */
  colorTolerance.addEventListener("input", () => {
    colorToleranceValue.textContent = colorTolerance.value;
    maybeAutosave();
  });

  // Watch most inputs for autosave
  [
    rugWidthEl, rugHeightEl, pileTypeEl, pileHeightEl,
    densityPresetEl, linesPerCmEl, stitchesPerCmEl,
    yarnNameEl, yarnStrandsEl, yarnGPerMEl, yarnMPerKgEl,
    wastagePercentEl, alphaThresholdEl, minAreaPercentEl,
    rememberEl
  ].forEach(el => el && el.addEventListener("input", maybeAutosave));

  /* ----------------------------- Analyze click --------------------------- */
  analyzeButton.addEventListener("click", () => {
    if (!appState.imageLoaded) return;

    // Read params
    const params = readForm();
    if (!(params.rugWidthCm > 0 && params.rugHeightCm > 0)) {
      resultsSummary.innerHTML = `<p style="color:#b91c1c">
        Please enter a positive Rug width & height (cm) before analyzing.
      </p>`;
      return;
    }

    // 1) Color analysis
    const { clusters, dropped, totals } = analyzeImage(previewCanvas, {
      alphaThreshold: params.alphaThreshold,
      tolerance: params.tolerance,
      minAreaPercent: params.minAreaPercent,
      rugWidthCm: params.rugWidthCm,
      rugHeightCm: params.rugHeightCm,
    });

    // 2) Yarn constants
    const constants = computeYarnConstants({
      mode: appState.mode,
      densityPreset: params.densityPreset,
      linesPerCm: params.linesPerCm,
      stitchesPerCm: params.stitchesPerCm,
      pileType: params.pileType,
      pileHeightMm: params.pileHeightMm,
      strands: params.strands,
      wastagePercent: params.wastagePercent,
      yarnGPerM: params.yarnGPerM,
      yarnMPerKg: params.yarnMPerKg,
    });

    // 3) Yarn per color
    const yarn = computeYarnForClusters(clusters, constants);
    // Keep interactive data
    lastPerColor = yarn.perColor;
    selectedColorIdxs.clear();

    // 4) Render
    renderSummary(resultsSummary, { clusters, totals, dropped, constants, yarn });
    renderYarnTable(resultsColors, yarn.perColor);
  });

    // Results action buttons
  const exportCsvBtn = document.getElementById("export-csv-button");
  const renameInput = document.getElementById("rename-color-input");
  const renameBtn = document.getElementById("rename-color-button");
  const mergeBtn = document.getElementById("merge-colors-button");

  exportCsvBtn.addEventListener("click", () => {
    if (!lastPerColor.length) {
      alert("No results to export.");
      return;
    }
    const csv = buildCsv(lastPerColor);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tufting-yarn-estimate.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  renameBtn.addEventListener("click", () => {
    const selection = [...selectedColorIdxs];
    if (selection.length !== 1) {
      alert("Select exactly one color row to rename.");
      return;
    }
    const idx = selection[0];
    const name = (renameInput.value || "").trim();
    const hex = lastPerColor[idx]?.hex;
    if (!hex) return;
    if (name) colorNames.set(hex, name); else colorNames.delete(hex);
    // Re-render table to reflect new name
    const container = document.getElementById("results-colors");
    renderYarnTable(container, lastPerColor);
  });

  mergeBtn.addEventListener("click", () => {
    const selection = [...selectedColorIdxs].sort((a,b)=>a-b);
    if (selection.length < 2) {
      alert("Select two or more color rows to merge.");
      return;
    }
    // Merge into the FIRST selected index
    const targetIdx = selection[0];
    const target = lastPerColor[targetIdx];
    if (!target) return;

    for (let i = selection.length - 1; i >= 1; i--) {
      const idx = selection[i];
      const src = lastPerColor[idx];
      if (!src) continue;
      // Sum numeric fields
      target.pixelCount += src.pixelCount;
      target.percentValid += src.percentValid;
      target.areaCm2 += src.areaCm2;
      target.yarnLength_m_single += src.yarnLength_m_single;
      target.yarnLength_m += src.yarnLength_m;
      target.yarnWeight_g += src.yarnWeight_g;
      target.yarnWeightWithWaste_g += src.yarnWeightWithWaste_g;

      // Remove source color and any stored name
      colorNames.delete(src.hex);
      lastPerColor.splice(idx, 1);
    }
    // Keep target's hex and (optional) name
    // Re-render
    const container = document.getElementById("results-colors");
    renderYarnTable(container, lastPerColor);
  });

  function buildCsv(perColor) {
    const header = [
      "color_hex",
      "color_name",
      "percent_of_valid",
      "area_cm2",
      "yarn_m",
      "weight_g_incl_waste",
      "pixels"
    ].join(",");

    const rows = perColor.map(c => [
      c.hex,
      csvEscape(colorNames.get(c.hex) || ""),
      numFmt(c.percentValid, 2),
      numFmt(c.areaCm2, 2),
      numFmt(c.yarnLength_m, 2),
      numFmt(c.yarnWeightWithWaste_g, 1),
      String(c.pixelCount)
    ].join(","));

    // Optional totals row
    const totalLen = perColor.reduce((s,c)=>s + c.yarnLength_m, 0);
    const totalW   = perColor.reduce((s,c)=>s + c.yarnWeightWithWaste_g, 0);
    const totalA   = perColor.reduce((s,c)=>s + c.areaCm2, 0);
    rows.push([
      "TOTAL",
      "",
      "",
      numFmt(totalA, 2),
      numFmt(totalLen, 2),
      numFmt(totalW, 1),
      ""
    ].join(","));

    return [header, ...rows].join("\n");
  }

  function numFmt(x, d) {
    const n = Number(x);
    return Number.isFinite(n) ? n.toFixed(d) : "";
  }
  function csvEscape(s) {
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }


  /* ------------------------------ Presets UI ----------------------------- */
  savePresetBtn.addEventListener("click", () => {
    const name = (presetNameEl.value || "").trim();
    if (!name) {
      alert("Choose a preset name first.");
      return;
    }
    const settings = serializeSettingsForPreset();
    savePreset(name, settings);
    populatePresetSelect();
    alert(`Saved preset “${name}”.`);
  });

  presetSelectEl.addEventListener("change", () => {
    const name = presetSelectEl.value;
    if (!name) return;
    const presets = loadPresets();
    const p = presets.find(x => x.name === name);
    if (!p) return;
    applySettings(p.settings);
    setMode(p.settings.mode || "beginner");
    updateModeRadios();
    maybeAutosave();
  });

  deletePresetBtn.addEventListener("click", () => {
    const name = presetSelectEl.value;
    if (!name) return;
    if (!confirm(`Delete preset “${name}”?`)) return;
    deletePreset(name);
    populatePresetSelect();
    presetSelectEl.value = "";
  });

  /* -------------------------- Load on first start ------------------------ */
  // Fill tolerance label initially
  colorToleranceValue.textContent = colorTolerance.value;

  // Load presets into dropdown
  populatePresetSelect();

  // Restore last settings if present and checkbox is checked (default checked in HTML)
  const last = loadLastSettings();
  if (rememberEl.checked && last) {
    applySettings(last);
    setMode(last.mode || "beginner");
    updateModeRadios();
  } else {
    setMode("beginner");
    updateModeRadios();
  }

  /* --------------------------------- Utils -------------------------------- */
  function readForm() {
    return {
      mode: appState.mode,
      rugWidthCm: num(rugWidthEl.value),
      rugHeightCm: num(rugHeightEl.value),

      pileType: pileTypeEl.value || "cut",
      pileHeightMm: numDef(pileHeightEl.value, 12),

      densityPreset: densityPresetEl?.value || "medium",
      linesPerCm: num(linesPerCmEl?.value),
      stitchesPerCm: num(stitchesPerCmEl?.value),

      yarnName: yarnNameEl.value || "",
      strands: intDef(yarnStrandsEl.value, 2),
      yarnGPerM: posNumOrUndef(yarnGPerMEl.value),
      yarnMPerKg: posNumOrUndef(yarnMPerKgEl.value),
      wastagePercent: numDef(wastagePercentEl.value, 15),

      alphaThreshold: intDef(alphaThresholdEl.value, 10),
      minAreaPercent: numDef(minAreaPercentEl.value, 0.5),
      tolerance: intDef(colorTolerance.value, 40),
    };
  }

  function applySettings(s) {
    // Mode handled by setMode + radios
    setVal(rugWidthEl, s.rugWidthCm);
    setVal(rugHeightEl, s.rugHeightCm);

    setVal(pileTypeEl, s.pileType);
    setVal(pileHeightEl, s.pileHeightMm);

    setVal(densityPresetEl, s.densityPreset);
    setVal(linesPerCmEl, s.linesPerCm);
    setVal(stitchesPerCmEl, s.stitchesPerCm);

    setVal(yarnNameEl, s.yarnName);
    setVal(yarnStrandsEl, s.strands);
    setVal(yarnGPerMEl, s.yarnGPerM);
    setVal(yarnMPerKgEl, s.yarnMPerKg);
    setVal(wastagePercentEl, s.wastagePercent);

    setVal(alphaThresholdEl, s.alphaThreshold);
    setVal(minAreaPercentEl, s.minAreaPercent);
    setVal(colorTolerance, s.tolerance);
    colorToleranceValue.textContent = colorTolerance.value;
  }

  function serializeSettingsForPreset() {
    const s = readForm();
    // Preset stores *everything except the image* and the remember checkbox
    return s;
  }

  function updateModeRadios() {
    modeRadios.forEach(r => { r.checked = (r.value === appState.mode); });
    advancedFields.forEach(el => {
      el.style.display = appState.mode === "advanced" ? "flex" : "none";
    });
  }

  function populatePresetSelect() {
    const presets = loadPresets().sort((a, b) => a.name.localeCompare(b.name));
    presetSelectEl.innerHTML = `<option value="">— None —</option>` +
      presets.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join("");
  }

  function maybeAutosave() {
    if (!rememberEl.checked) {
      clearLastSettings();
      return;
    }
    const s = readForm();
    saveLastSettings({ ...s, mode: appState.mode });
  }

  // helpers
  function num(v) { return Number(v || 0); }
  function numDef(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  function intDef(v, d) { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; }
  function posNumOrUndef(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined; }
  function setVal(el, val) { if (!el) return; if (val === undefined || val === null) return; el.value = String(val); }
  function escapeHtml(s){ return (s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  /* -------------------------- Summary/Results UI ------------------------- */
  function renderSummary(container, { clusters, totals, dropped, constants, yarn }) {
    const fmt = (x, d = 2) => Number(x).toLocaleString(undefined, { maximumFractionDigits: d });
    const totalColors = clusters.length;
    const droppedInfo = dropped && dropped.length ? ` (dropped ${dropped.length} tiny group${dropped.length > 1 ? 's' : ''})` : '';
    const totalLen = yarn?.totals?.totalLength_m ?? 0;
    const totalW = yarn?.totals?.totalWeightWithWaste_g ?? 0;

    container.innerHTML = `
      <p><strong>Detected colors:</strong> ${totalColors}${droppedInfo}</p>
      <p><strong>Image size:</strong> ${previewCanvas.width}×${previewCanvas.height} px
         &nbsp;|&nbsp; <strong>Valid pixels:</strong> ${fmt(totals.pixelsValid, 0)}</p>
      <p><strong>Rug bounding box area:</strong> ${fmt(totals.boxAreaCm2)} cm²
         &nbsp;|&nbsp; <strong>Estimated tufted area:</strong> ${fmt(totals.areaCm2)} cm²</p>
      <p><strong>Yarn (all strands, incl. wastage):</strong>
         ${fmt(totalLen)} m &nbsp;|&nbsp; ${fmt(totalW)} g</p>
    `;
  }

  function renderYarnTable(container, perColor) {
    lastPerColor = perColor || [];
    selectedColorIdxs = new Set();

    if (!lastPerColor.length) {
      container.innerHTML = `<p>No color groups above the minimum area threshold.</p>`;
      return;
    }

    const rows = lastPerColor.map((c, idx) => {
      const pct = c.percentValid.toFixed(2);
      const area = c.areaCm2.toFixed(2);
      const len = c.yarnLength_m.toFixed(2);
      const w = c.yarnWeightWithWaste_g.toFixed(1);
      const name = colorNames.get(c.hex) || "";
      return `
        <tr data-row="${idx}" class="color-row">
          <td style="white-space:nowrap;">
            <span class="swatch" style="background:${c.hex}; border:1px solid #ccc; width:18px; height:18px; display:inline-block; vertical-align:middle; margin-right:8px; border-radius:3px;"></span>
            ${c.hex.toUpperCase()} ${name ? `&nbsp;<em style="color:#555;">(${escapeHtml(name)})</em>` : ""}
          </td>
          <td style="text-align:right;">${pct}%</td>
          <td style="text-align:right;">${area}</td>
          <td style="text-align:right;">${len}</td>
          <td style="text-align:right;">${w}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table id="results-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #eee; padding-bottom:6px;">Color</th>
              <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">% of valid</th>
              <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">Area (cm²)</th>
              <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">Yarn (m)</th>
              <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">Weight (g, incl. waste)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="hint" style="margin-top:0.5rem;">
        Click rows to select. Use “Rename selected” to label a color, or “Merge” to combine multiple selections into the first selected.
      </p>
    `;

    // Add interactive selection behavior
    const tbody = container.querySelector("tbody");
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-row]");
      if (!tr) return;
      const idx = Number(tr.getAttribute("data-row"));
      if (e.ctrlKey || e.metaKey) {
        toggleSelectRow(tr, idx);
      } else if (e.shiftKey) {
        rangeSelectRow(tbody, idx);
      } else {
        // single selection
        clearSelection(tbody);
        selectRow(tr, idx);
      }
    });
  }

  function selectRow(tr, idx) {
    selectedColorIdxs.add(idx);
    tr.classList.add("color-row-selected");
  }
  function toggleSelectRow(tr, idx) {
    if (selectedColorIdxs.has(idx)) {
      selectedColorIdxs.delete(idx);
      tr.classList.remove("color-row-selected");
    } else {
      selectedColorIdxs.add(idx);
      tr.classList.add("color-row-selected");
    }
  }
  function clearSelection(tbody) {
    selectedColorIdxs.clear();
    tbody.querySelectorAll("tr.color-row-selected").forEach(tr => tr.classList.remove("color-row-selected"));
  }
  function rangeSelectRow(tbody, idx) {
    // Select a continuous range between last selected and current
    const existing = [...selectedColorIdxs].sort((a,b)=>a-b);
    const anchor = existing.length ? existing[existing.length-1] : idx;
    const [lo, hi] = [Math.min(anchor, idx), Math.max(anchor, idx)];
    clearSelection(tbody);
    for (let i = lo; i <= hi; i++) {
      const tr = tbody.querySelector(`tr[data-row="${i}"]`);
      if (tr) selectRow(tr, i);
    }
  }


});

