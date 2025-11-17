import { analyzeImage } from "./imageProcessing.js";
import { computeYarnConstants, computeYarnForClusters } from "./calculation.js";
import {
	loadLastSettings, saveLastSettings, clearLastSettings,
	loadPresets, savePreset, deletePreset
} from "./storage.js";

const CM_PER_IN = 2.54;
const MM_PER_IN = 25.4;
const M_PER_YD = 0.9144;
const G_PER_OZ = 28.349523125;
const KG_PER_LB = 0.45359237;
const G_PER_LB = KG_PER_LB * 1000;
const CM2_PER_FT2 = 929.0304;
const DEFAULT_UNIT_SYSTEM = "metric";

const UNIT_CONVERSIONS = {
	rugLength: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "cm", decimals: 1, csv: "cm" },
		imperial: { toMetric: (v) => v * CM_PER_IN, fromMetric: (v) => v / CM_PER_IN, label: "in", decimals: 2, csv: "in" }
	},
	pileHeight: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "mm", decimals: 0, csv: "mm" },
		imperial: { toMetric: (v) => v * MM_PER_IN, fromMetric: (v) => v / MM_PER_IN, label: "in", decimals: 2, csv: "in" }
	},
	density: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "cm", decimals: 2, csv: "per_cm" },
		imperial: { toMetric: (v) => v / CM_PER_IN, fromMetric: (v) => v * CM_PER_IN, label: "in", decimals: 2, csv: "per_in" }
	},
	yarnWeightSpec: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "g per m", decimals: 3, csv: "g_per_m" },
		imperial: { toMetric: (v) => (v * G_PER_OZ) / M_PER_YD, fromMetric: (v) => (v * M_PER_YD) / G_PER_OZ, label: "oz per yd", decimals: 3, csv: "oz_per_yd" }
	},
	yarnLengthSpec: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "m per kg", decimals: 0, csv: "m_per_kg" },
		imperial: { toMetric: (v) => (v * M_PER_YD) / KG_PER_LB, fromMetric: (v) => (v * KG_PER_LB) / M_PER_YD, label: "yd per lb", decimals: 0, csv: "yd_per_lb" }
	},
	pricePerMass: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "per kg", decimals: 2, csv: "per_kg" },
		imperial: { toMetric: (v) => v / KG_PER_LB, fromMetric: (v) => v * KG_PER_LB, label: "per lb", decimals: 2, csv: "per_lb" }
	},
	skeinWeight: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "g", decimals: 0, csv: "g" },
		imperial: { toMetric: (v) => v * G_PER_OZ, fromMetric: (v) => v / G_PER_OZ, label: "oz", decimals: 2, csv: "oz" }
	},
	helperLength: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "m", decimals: 1 },
		imperial: { toMetric: (v) => v * M_PER_YD, fromMetric: (v) => v / M_PER_YD, label: "yd", decimals: 2 }
	},
	helperWeight: {
		metric: { toMetric: (v) => v, fromMetric: (v) => v, label: "g", decimals: 1 },
		imperial: { toMetric: (v) => v * G_PER_OZ, fromMetric: (v) => v / G_PER_OZ, label: "oz", decimals: 2 }
	},
	helperLengthPerMass: {
		metric: { toMetric: (v) => v * 10, fromMetric: (v) => v / 10, label: "m per 100 g", decimals: 1, csv: "m_per_100g" },
		imperial: { toMetric: (v) => (v * M_PER_YD) / KG_PER_LB, fromMetric: (v) => (v * KG_PER_LB) / M_PER_YD, label: "yd per lb", decimals: 0, csv: "yd_per_lb" }
	},
	area: {
		metric: { fromMetric: (v) => v, label: "cm²", decimals: 2, csv: "cm2" },
		imperial: { fromMetric: (v) => v / CM2_PER_FT2, label: "ft²", decimals: 2, csv: "ft2" }
	},
	yarnTotalLength: {
		metric: { fromMetric: (v) => v, label: "m", decimals: 2, csv: "m" },
		imperial: { fromMetric: (v) => v / M_PER_YD, label: "yd", decimals: 2, csv: "yd" }
	},
	yarnWeightResult: {
		metric: { fromMetric: (v) => v, label: "g", decimals: 1, csv: "g" },
		imperial: { fromMetric: (v) => v / G_PER_LB, label: "lb", decimals: 2, csv: "lb" }
	}
};

const CURRENCY_INFO = {
	metric: { symbol: "€", code: "EUR" },
	imperial: { symbol: "$", code: "USD" }
};

const LABEL_TEXT = {
	"unit-system-label": { metric: "Unit system", imperial: "Unit system" },
	"rug-width-label": { metric: "Rug width (cm)", imperial: "Rug width (in)" },
	"rug-height-label": { metric: "Rug height (cm)", imperial: "Rug height (in)" },
	"pile-height-label": { metric: "Pile height (mm)", imperial: "Pile height (in)" },
	"lines-per-label": { metric: "Lines per cm", imperial: "Lines per in" },
	"stitches-per-label": { metric: "Stitches per cm", imperial: "Stitches per in" },
	"yarn-weight-label": {
		metric: "Yarn weight (g per meter, single strand)",
		imperial: "Yarn weight (oz per yard, single strand)"
	},
	"yarn-length-label": {
		metric: "Yarn length (m per kg, single strand)",
		imperial: "Yarn length (yd per lb, single strand)"
	},
	"yarn-price-label": { metric: "Yarn price (per kg)", imperial: "Yarn price (per lb)" },
	"skein-weight-label": { metric: "Skein weight (g)", imperial: "Skein weight (oz)" },
	"skein-price-label": { metric: "Skein price (€)", imperial: "Skein price ($)" },
	"helper-length-label": { metric: "Label length (m)", imperial: "Label length (yd)" },
	"helper-weight-label": { metric: "Label weight (g)", imperial: "Label weight (oz)" },
	"helper-mass-length-label": { metric: "m per 100 g", imperial: "yd per lb" }
};

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
	const labelEls = {};
	Object.keys(LABEL_TEXT).forEach((key) => {
		labelEls[key] = document.querySelector(`[data-label="${key}"]`);
	});

	// Mode
	const modeRadios = document.querySelectorAll('input[name="mode"]');
	const advancedFields = document.querySelectorAll(".advanced-only");

	// Project inputs
	const rugWidthEl = document.getElementById("rug-width");
	const rugHeightEl = document.getElementById("rug-height");
	const lockAspectEl = document.getElementById("lock-aspect");
	const unitSystemEl = document.getElementById("unit-system");
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
	const yarnPricePerKgEl = document.getElementById("yarn-price-per-kg");
	const skeinWeightEl = document.getElementById("skein-weight-g");
	const skeinPriceEl = document.getElementById("skein-price");


	// Analysis inputs
	const alphaThresholdEl = document.getElementById("alpha-threshold");
	const minAreaPercentEl = document.getElementById("min-area-percent");

	// Persistence UI
	const rememberEl = document.getElementById("remember-settings");
	const presetNameEl = document.getElementById("preset-name");
	const savePresetBtn = document.getElementById("save-preset-button");
	const presetSelectEl = document.getElementById("preset-select");
	const deletePresetBtn = document.getElementById("delete-preset-button");

	// Yarn helper elements
	const yhLenM = document.getElementById("yh-length-m");
	const yhWtG = document.getElementById("yh-weight-g");
	const yhM100 = document.getElementById("yh-m-per-100g");
	const yhTex = document.getElementById("yh-tex");
	const btnApplyLenWt = document.getElementById("yh-apply-len-wt");
	const btnApplyM100 = document.getElementById("yh-apply-m100");
	const btnApplyTex = document.getElementById("yh-apply-tex");

	// Preview controls
	const overlayModeEl = document.getElementById("overlay-mode");
	const overlayDimEl = document.getElementById("overlay-dim");
	const analysisResEl = document.getElementById("analysis-resolution");
	const legendEl = document.getElementById("legend");
	const previewReadout = document.getElementById("preview-readout");



	let appState = {
		mode: "beginner",
		unitSystem: DEFAULT_UNIT_SYSTEM,
		imageLoaded: false,
		imageNatural: { w: 0, h: 0 },
	};
	// Holds the latest computed color rows for interaction (rename/merge/export)
	let lastPerColor = [];
	// Track user selection of color indices (by their order in lastPerColor)
	let selectedColorIdxs = new Set();
	// Optional user-given names for colors (persist only for this session)
	let colorNames = new Map(); // key: hex string, value: name


	let baseImageData = null;      // ImageData of the clean image in preview canvas
	let analysisLabels = null;     // Int16Array of length w*h, mapping to kept cluster index or -1
	let analysisSize = { width: 0, height: 0 }; // should match previewCanvas
	let hoverClusterIdx = -1;
	let lastRenderPayload = null;


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

	setUnitSystem(unitSystemEl?.value || DEFAULT_UNIT_SYSTEM, { convertExistingValues: false, skipRefresh: true });
	unitSystemEl?.addEventListener("change", () => {
		setUnitSystem(unitSystemEl.value);
		maybeAutosave();
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

				baseImageData = ctx.getImageData(0, 0, width, height);
				analysisLabels = null; // reset labels until next analysis
				analysisSize = { width, height };

				previewCanvas.style.display = "block";
				previewPlaceholder.style.display = "none";

				appState.imageLoaded = true;
				analyzeButton.disabled = false;

				resultsSummary.innerHTML = "<p>Ready to analyze. Click “Analyze image”.</p>";
				resultsColors.innerHTML = "";
				lastPerColor = [];
				selectedColorIdxs.clear();
				lastRenderPayload = null;
				renderLegend(legendEl, lastPerColor);
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
		rugWidthEl, rugHeightEl, lockAspectEl, pileTypeEl, pileHeightEl,
		densityPresetEl, linesPerCmEl, stitchesPerCmEl,
		yarnNameEl, yarnStrandsEl, yarnGPerMEl, yarnMPerKgEl,
		yarnPricePerKgEl, skeinWeightEl, skeinPriceEl,
		wastagePercentEl, alphaThresholdEl, minAreaPercentEl,
		rememberEl
	].forEach(el => el && el.addEventListener("input", maybeAutosave));


	/* ---------------------- Viewport-safe tooltip layer --------------------- */
	const TOOLTIP_MARGIN = 8;
	const TIP_GAP = 10; // distance from the trigger element
	let tooltipEl;

	initTooltipLayer();
	bindTipEvents();

	function initTooltipLayer() {
		tooltipEl = document.createElement('div');
		tooltipEl.className = 'tooltip-layer';
		tooltipEl.setAttribute('role', 'tooltip');
		const arrow = document.createElement('div');
		arrow.className = 'arrow';
		tooltipEl.appendChild(arrow);
		document.body.appendChild(tooltipEl);

		// Hide on window changes
		window.addEventListener('scroll', hideTooltip, { passive: true });
		window.addEventListener('resize', hideTooltip);
	}

	function bindTipEvents() {
		// Delegate to whole document to catch dynamically added tips
		document.addEventListener('mouseenter', tipEnter, true);
		document.addEventListener('mouseleave', tipLeave, true);
		document.addEventListener('focusin', tipEnter, true);
		document.addEventListener('focusout', tipLeave, true);
	}

	let tipHideTimer = null;

	function tipEnter(e) {
		const el = e.target.closest('.tip[data-tip]');
		if (!el) return;
		clearTimeout(tipHideTimer);
		showTooltip(el);
	}

	function tipLeave(e) {
		const el = e.target.closest('.tip[data-tip]');
		if (!el) return;
		// small delay makes it feel smoother when moving the mouse
		tipHideTimer = setTimeout(hideTooltip, 80);
	}

	function showTooltip(trigger) {
		const text = trigger.getAttribute('data-tip');
		if (!text) return;

		tooltipEl.textContent = ''; // reset
		// rebuild content so we keep the arrow element
		const arrow = document.createElement('div');
		arrow.className = 'arrow';
		tooltipEl.append(text);
		tooltipEl.appendChild(arrow);

		// Measure trigger
		const r = trigger.getBoundingClientRect();

		// Prefer placing on top; if not enough space, place bottom
		const tooltipWidth = Math.min(340, Math.floor(window.innerWidth * 0.92));
		tooltipEl.style.maxWidth = tooltipWidth + 'px';
		tooltipEl.style.left = '0px'; // reset to measure
		tooltipEl.style.top = '-9999px';
		tooltipEl.setAttribute('data-show', 'true'); // set visible to get size
		tooltipEl.setAttribute('data-placement', 'top');

		// Let it render to measure size
		requestAnimationFrame(() => {
			const rect = tooltipEl.getBoundingClientRect();
			const arrowRect = 10; // square size

			// Horizontal center on trigger, then clamp within viewport
			const desiredLeft = r.left + r.width / 2 - rect.width / 2;
			const clampedLeft = Math.max(
				TOOLTIP_MARGIN,
				Math.min(desiredLeft, window.innerWidth - rect.width - TOOLTIP_MARGIN)
			);

			// Compute top/bottom placement
			const spaceAbove = r.top;
			const spaceBelow = window.innerHeight - r.bottom;

			let top, placement;
			if (spaceAbove >= rect.height + TIP_GAP + TOOLTIP_MARGIN) {
				// place above
				top = r.top - rect.height - TIP_GAP;
				placement = 'top';
			} else if (spaceBelow >= rect.height + TIP_GAP + TOOLTIP_MARGIN) {
				// place below
				top = r.bottom + TIP_GAP;
				placement = 'bottom';
			} else {
				// not enough space either side; choose side with more room and clamp
				if (spaceAbove > spaceBelow) {
					top = Math.max(TOOLTIP_MARGIN, r.top - rect.height - TIP_GAP);
					placement = 'top';
				} else {
					top = Math.min(window.innerHeight - rect.height - TOOLTIP_MARGIN, r.bottom + TIP_GAP);
					placement = 'bottom';
				}
			}

			tooltipEl.style.left = `${Math.round(clampedLeft)}px`;
			tooltipEl.style.top = `${Math.round(top)}px`;
			tooltipEl.setAttribute('data-placement', placement);

			// Position arrow centered over trigger (but keep arrow inside tooltip)
			const arrowEl = tooltipEl.querySelector('.arrow');
			const arrowLeft = (r.left + r.width / 2) - clampedLeft - arrowRect / 2;
			const arrowLeftClamped = Math.max(6, Math.min(arrowLeft, rect.width - 6 - arrowRect));
			arrowEl.style.left = `${Math.round(arrowLeftClamped)}px`;
		});
	}

	function hideTooltip() {
		tooltipEl?.setAttribute('data-show', 'false');
	}


	// Avoid recursion when we update width/height programmatically
	let isUpdatingRugSize = false;

	lockAspectEl.addEventListener("change", () => {
		if (lockAspectEl.checked) {
			// When turning on, if we have an image and one dimension is set, recompute the other
			if (appState.imageNatural.w > 0 && appState.imageNatural.h > 0) {
				const w = num(rugWidthEl.value);
				const h = num(rugHeightEl.value);
				const ratio = appState.imageNatural.w / appState.imageNatural.h;

				isUpdatingRugSize = true;
				if (w > 0 && !h) {
					rugHeightEl.value = (w / ratio).toFixed(1);
				} else if (h > 0 && !w) {
					rugWidthEl.value = (h * ratio).toFixed(1);
				}
				isUpdatingRugSize = false;
			}
		}
		maybeAutosave();
	});

	rugWidthEl.addEventListener("input", () => {
		if (isUpdatingRugSize) return;
		if (!lockAspectEl.checked) { maybeAutosave(); return; }
		if (!appState.imageNatural.w || !appState.imageNatural.h) { maybeAutosave(); return; }

		const w = num(rugWidthEl.value);
		if (!(w > 0)) { maybeAutosave(); return; }

		const ratio = appState.imageNatural.w / appState.imageNatural.h;
		const h = w / ratio;

		isUpdatingRugSize = true;
		rugHeightEl.value = h.toFixed(1);
		isUpdatingRugSize = false;
		maybeAutosave();
	});

	rugHeightEl.addEventListener("input", () => {
		if (isUpdatingRugSize) return;
		if (!lockAspectEl.checked) { maybeAutosave(); return; }
		if (!appState.imageNatural.w || !appState.imageNatural.h) { maybeAutosave(); return; }

		const h = num(rugHeightEl.value);
		if (!(h > 0)) { maybeAutosave(); return; }

		const ratio = appState.imageNatural.w / appState.imageNatural.h;
		const w = h * ratio;

		isUpdatingRugSize = true;
		rugWidthEl.value = w.toFixed(1);
		isUpdatingRugSize = false;
		maybeAutosave();
	});


	/* ----------------------------- Analyze click --------------------------- */
	analyzeButton.addEventListener("click", () => {
		if (!appState.imageLoaded) return;

		// Read params
		const params = readForm();
		if (!(params.rugWidthCm > 0 && params.rugHeightCm > 0)) {
			const lengthUnit = getUnitLabel("rugLength");
			resultsSummary.innerHTML = `<p style="color:#b91c1c">
	Please enter a positive Rug width & height (${lengthUnit}) before analyzing.
      </p>`;
			return;
		}

		// Optionally re-draw image at a specific resolution for analysis
		const ctx = previewCanvas.getContext("2d");
		let restoreAfter = null;
		const chosen = analysisResEl.value;
		if (chosen !== "auto") {
			const factor = Number(chosen);
			if (Number.isFinite(factor) && factor > 0 && factor <= 1) {
				// Save current preview
				const saved = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
				restoreAfter = saved;

				const newW = Math.max(1, Math.round(appState.imageNatural.w * Math.min(600 / appState.imageNatural.w, 1) * factor));
				const newH = Math.max(1, Math.round(appState.imageNatural.h * Math.min(400 / appState.imageNatural.h, 1) * factor));
				const imgBitmap = createImageBitmap(dataURLToBlob(imageInput.files[0]));
				previewCanvas.width = newW;
				previewCanvas.height = newH;
				ctx.clearRect(0, 0, newW, newH);
				ctx.drawImage(imgBitmap, 0, 0, newW, newH);
				baseImageData = ctx.getImageData(0, 0, newW, newH);
				analysisSize = { width: newW, height: newH };
			}
		}

		// Helper converts file dataURL to Blob
		function dataURLToBlob(file) { return file; }


		// 1) Color analysis
		const result = analyzeImage(previewCanvas, {
			alphaThreshold: params.alphaThreshold,
			tolerance: params.tolerance,
			minAreaPercent: params.minAreaPercent,
			rugWidthCm: params.rugWidthCm,
			rugHeightCm: params.rugHeightCm,
		});

		const { clusters, dropped, totals, labels, size } = result;
		analysisLabels = labels;
		analysisSize = size;


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

		let pricePerKg = undefined;
		if (params.yarnPricePerKg && params.yarnPricePerKg > 0) {
			pricePerKg = params.yarnPricePerKg;
		} else if (params.skeinWeightG && params.skeinPrice && params.skeinWeightG > 0) {
			// price/kg = (price / weight_g) * 1000
			pricePerKg = (skeinPrice / skeinWeightG) * 1000;
		}

		// 3) Yarn per color
		const yarn = computeYarnForClusters(clusters, { ...constants, pricePerKg });
		// Keep interactive data
		lastPerColor = yarn.perColor;
		selectedColorIdxs.clear();

		// 4) Render
		const payload = { clusters, totals, dropped, constants, yarn };
		renderSummary(resultsSummary, payload);
		lastRenderPayload = payload;
		renderYarnTable(resultsColors, yarn.perColor);

		if (restoreAfter) {
			// restore canvas size back to saved dimensions
			const oldW = restoreAfter.width, oldH = restoreAfter.height;
			previewCanvas.width = oldW;
			previewCanvas.height = oldH;
			const rctx = previewCanvas.getContext("2d");
			rctx.putImageData(restoreAfter, 0, 0);
			baseImageData = rctx.getImageData(0, 0, oldW, oldH);
			analysisSize = { width: oldW, height: oldH };
		}

		renderLegend(legendEl, lastPerColor);
		drawOverlay(); // respect current overlay mode
		updateActionButtons();


	});

	// Click inside the preview to select the color under the cursor
	previewCanvas.addEventListener("click", (e) => {
		if (!analysisLabels || !baseImageData) return;

		const rect = previewCanvas.getBoundingClientRect();
		const scaleX = previewCanvas.width / rect.width;
		const scaleY = previewCanvas.height / rect.height;

		const x = Math.floor((e.clientX - rect.left) * scaleX);
		const y = Math.floor((e.clientY - rect.top) * scaleY);

		if (x < 0 || y < 0 || x >= previewCanvas.width || y >= previewCanvas.height) return;

		const idx = y * previewCanvas.width + x;
		const cluster = analysisLabels[idx]; // -1 if transparent/unassigned
		if (cluster < 0) return;

		// Toggle or single-select depending on Ctrl/Cmd
		const multi = e.ctrlKey || e.metaKey;
		if (!multi) {
			selectedColorIdxs.clear();
			selectedColorIdxs.add(cluster);
		} else {
			if (selectedColorIdxs.has(cluster)) selectedColorIdxs.delete(cluster);
			else selectedColorIdxs.add(cluster);
		}

		// Re-render legend & table to reflect selection; update overlay
		renderLegend(legendEl, lastPerColor);
		const containerTbl = document.getElementById("results-colors");
		renderYarnTable(containerTbl, lastPerColor);
		drawOverlay();

		// Optional: scroll the selected row into view
		try {
			const row = containerTbl.querySelector(`tr[data-row="${cluster}"]`);
			row?.scrollIntoView({ block: "nearest" });
		} catch { }
	});

	// --- Hover readout over the preview canvas ---
	previewCanvas.addEventListener("mouseleave", () => {
		hidePreviewReadout();
		// reset hover highlight
		if (hoverClusterIdx !== -1) {
			hoverClusterIdx = -1;
			drawOverlay();
		}
	});

	previewCanvas.addEventListener("mousemove", (e) => {
		const rect = previewCanvas.getBoundingClientRect();
		const scaleX = previewCanvas.width / rect.width;
		const scaleY = previewCanvas.height / rect.height;
		const x = Math.floor((e.clientX - rect.left) * scaleX);
		const y = Math.floor((e.clientY - rect.top) * scaleY);

		if (x < 0 || y < 0 || x >= previewCanvas.width || y >= previewCanvas.height) {
			hidePreviewReadout();
			if (hoverClusterIdx !== -1) { hoverClusterIdx = -1; drawOverlay(); }
			return;
		}

		// If analyzed, detect hovered cluster for highlight
		let hovered = -1;
		if (analysisLabels && lastPerColor?.length) {
			const idx = y * previewCanvas.width + x;
			const cl = analysisLabels[idx]; // -1 if transparent
			if (cl >= 0 && cl < lastPerColor.length) hovered = cl;
		}

		// Update hover highlight only if it changed
		if (hovered !== hoverClusterIdx) {
			hoverClusterIdx = hovered;
			drawOverlay();
		}

		// (existing readout logic continues below…)
		if (analysisLabels && lastPerColor?.length && hoverClusterIdx >= 0) {
			const c = lastPerColor[hoverClusterIdx];
			const name = colorNames.get(c.hex) || "";
			const pct = c.percentValid.toFixed(2) + "%";
			const content = `
	<div class="row">
	  <span class="sw" style="background:${c.hex}"></span>
	  <span><strong>${c.hex.toUpperCase()}</strong>${name ? ` <em>(${escapeHtml(name)})</em>` : ""}</span>
	</div>
	<div>${pct} of valid pixels</div>
      `;
			showPreviewReadoutAt(e.clientX, e.clientY, content);
			return;
		}

		// Fallback readout…
		try {
			const ctx = previewCanvas.getContext("2d", { willReadFrequently: true });
			const px = ctx.getImageData(x, y, 1, 1).data;
			if (px[3] === 0) { hidePreviewReadout(); return; }
			const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
			const content = `
	<div class="row">
	  <span class="sw" style="background:${hex}"></span>
	  <span><strong>${hex.toUpperCase()}</strong></span>
	</div>
	<div>Unanalyzed pixel</div>
      `;
			showPreviewReadoutAt(e.clientX, e.clientY, content);
		} catch {
			hidePreviewReadout();
		}
	});


	function showPreviewReadoutAt(clientX, clientY, html) {
		previewReadout.innerHTML = html;
		previewReadout.setAttribute("data-show", "true");

		// Position relative to preview container, clamped inside it
		const contRect = document.getElementById("preview-container").getBoundingClientRect();
		const rd = previewReadout.getBoundingClientRect();
		const gap = 10;

		let left = clientX - contRect.left + gap;
		let top = clientY - contRect.top + gap;

		// Clamp so it stays visible in the container
		if (left + rd.width > contRect.width - 6) left = contRect.width - rd.width - 6;
		if (top + rd.height > contRect.height - 6) top = contRect.height - rd.height - 6;
		if (left < 6) left = 6;
		if (top < 6) top = 6;

		previewReadout.style.left = `${Math.round(left)}px`;
		previewReadout.style.top = `${Math.round(top)}px`;
	}

	function hidePreviewReadout() {
		previewReadout?.setAttribute("data-show", "false");
	}



	// --- Yarn helper: Label length/weight -> g/m & m/kg ---
	btnApplyLenWt.addEventListener("click", () => {
		const lengthInput = Number(yhLenM.value);
		const weightInput = Number(yhWtG.value);
		const lengthM = convertDisplayToMetric("helperLength", lengthInput);
		const weightG = convertDisplayToMetric("helperWeight", weightInput);
		if (!isFinite(lengthM) || !isFinite(weightG) || lengthM <= 0 || weightG <= 0) {
			alert("Please enter positive values for label length and weight.");
			return;
		}
		// g/m = grams / meters
		const gpm = weightG / lengthM;
		// m/kg = meters per 1000 g
		const mpkg = (lengthM / weightG) * 1000;

		setFieldFromMetric(yarnGPerMEl, gpm, "yarnWeightSpec");
		setFieldFromMetric(yarnMPerKgEl, mpkg, "yarnLengthSpec");
		maybeAutosave();
	});

	// --- Yarn helper: m per 100 g -> g/m & m/kg ---
	btnApplyM100.addEventListener("click", () => {
		const rawInput = Number(yhM100.value);
		const lengthPerMass = convertDisplayToMetric("helperLengthPerMass", rawInput);
		if (!isFinite(lengthPerMass) || lengthPerMass <= 0) {
			alert("Enter a positive value for the length-per-weight helper field.");
			return;
		}
		// helperLengthPerMass already returns m/kg
		const mpkg = lengthPerMass;
		// g/m = 1000 / m/kg
		const gpm = 1000 / mpkg;

		setFieldFromMetric(yarnGPerMEl, gpm, "yarnWeightSpec");
		setFieldFromMetric(yarnMPerKgEl, mpkg, "yarnLengthSpec");
		maybeAutosave();
	});

	// --- Yarn helper: Tex (g per 1000 m) -> g/m & m/kg ---
	btnApplyTex.addEventListener("click", () => {
		const tex = Number(yhTex.value);
		if (!isFinite(tex) || tex <= 0) {
			alert("Enter a positive Tex (grams per 1000 meters).");
			return;
		}
		// Tex = g / 1000 m  -> g/m = tex / 1000
		const gpm = tex / 1000;
		// m/kg = 1000 / g/m
		const mpkg = 1000 / gpm;

		setFieldFromMetric(yarnGPerMEl, gpm, "yarnWeightSpec");
		setFieldFromMetric(yarnMPerKgEl, mpkg, "yarnLengthSpec");
		maybeAutosave();
	});


	// Results action buttons
	const exportCsvBtn = document.getElementById("export-csv-button");
	const renameInput = document.getElementById("rename-color-input");
	const renameBtn = document.getElementById("rename-color-button");
	const mergeBtn = document.getElementById("merge-colors-button");
	const exportPdfBtn = document.getElementById("export-pdf-button");

	exportPdfBtn.addEventListener("click", () => {
		if (!lastPerColor.length) {
			alert("No results to export. Analyze an image first.");
			return;
		}
		try {
			exportToPDF();
		} catch (e) {
			console.error(e);
			alert("PDF export failed. See console for details.");
		}
	});


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
		if (selection.length !== 1) { alert("Select exactly one color row to rename."); return; }
		const idx = selection[0];
		const name = (renameInput.value || "").trim();
		const hex = lastPerColor[idx]?.hex;
		if (!hex) return;
		if (name) colorNames.set(hex, name); else colorNames.delete(hex);

		const container = document.getElementById("results-colors");
		renderYarnTable(container, lastPerColor);
		renderLegend(legendEl, lastPerColor);
		drawOverlay();
		updateActionButtons();
		refreshSummaryAfterManualChange();
	});


	mergeBtn.addEventListener("click", () => {
		const selection = [...selectedColorIdxs].sort((a, b) => a - b);
		if (selection.length < 2) {
			alert("Select two or more color rows to merge.");
			return;
		}
		const targetIdx = selection[0];
		const target = lastPerColor[targetIdx];
		if (!target) return;

		// Merge selected sources into target (skip index 0 because it's the target)
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

			if (typeof target.yarnCost !== "number") target.yarnCost = 0;
			if (typeof src.yarnCost === "number" && !Number.isNaN(src.yarnCost)) {
				target.yarnCost += src.yarnCost;
			}

			// Remove source (and its optional name)
			colorNames.delete(src.hex);
			lastPerColor.splice(idx, 1);
		}

		// Reset selection to the (now-updated) target only
		selectedColorIdxs.clear();
		selectedColorIdxs.add(targetIdx);

		// Re-render table + legend
		const container = document.getElementById("results-colors");
		renderYarnTable(container, lastPerColor);
		renderLegend(legendEl, lastPerColor);

		// Overlay & buttons
		drawOverlay();
		updateActionButtons();

		// Refresh the summary totals to reflect the merged rows
		refreshSummaryAfterManualChange();
	});

	function refreshSummaryAfterManualChange() {
		// Recompute totals from lastPerColor
		const totalLen = lastPerColor.reduce((s, c) => s + (c.yarnLength_m || 0), 0);
		const totalW = lastPerColor.reduce((s, c) => s + (c.yarnWeightWithWaste_g || 0), 0);
		const totalA = lastPerColor.reduce((s, c) => s + (c.areaCm2 || 0), 0);
		const totalCost = lastPerColor.reduce((s, c) => s + (c.yarnCost || 0), 0);

		// Keep previously computed pixel/area box stats if available
		// We can derive some from the canvas if needed; simplest is to keep last known.
		const prevTotals = lastRenderPayload?.totals || {};
		const fallbackPixels = (analysisLabels ? analysisLabels.length - (analysisLabels.filter(v => v < 0).length) : 0);
		const fauxTotals = {
			...prevTotals,
			pixelsValid: prevTotals.pixelsValid ?? fallbackPixels,
			boxAreaCm2: prevTotals.boxAreaCm2 ?? 0,
			areaCm2: totalA
		};

		const fauxYarn = {
			perColor: lastPerColor,
			totals: {
				totalArea_cm2: totalA,
				totalLength_m: totalLen,
				totalWeightWithWaste_g: totalW,
				totalCost: totalCost
			}
		};

		const payload = {
			clusters: lastPerColor, // close enough for count
			totals: fauxTotals,
			dropped: [],
			constants: null,
			yarn: fauxYarn
		};

		// Render with minimal viable args
		renderSummary(resultsSummary, payload);
		lastRenderPayload = payload;
	}


	function buildCsv(perColor) {
		const areaUnitSlug = getUnitCsvLabel("area");
		const lengthUnitSlug = getUnitCsvLabel("yarnTotalLength");
		const weightUnitSlug = getUnitCsvLabel("yarnWeightResult");
		const currencyCode = getCurrencyCode().toLowerCase();
		const header = [
			"color_hex",
			"color_name",
			"percent_of_valid",
			`area_${areaUnitSlug}`,
			`yarn_${lengthUnitSlug}`,
			`weight_${weightUnitSlug}_incl_waste`,
			`cost_${currencyCode}`,
			"pixels"
		].join(",");

		const rows = perColor.map(c => [
			c.hex,
			csvEscape(colorNames.get(c.hex) || ""),
			numFmt(c.percentValid, 2),
			numFmt(convertMetricToDisplay("area", c.areaCm2), 2),
			numFmt(convertMetricToDisplay("yarnTotalLength", c.yarnLength_m), 2),
			numFmt(convertMetricToDisplay("yarnWeightResult", c.yarnWeightWithWaste_g), 2),
			numFmt(c.yarnCost, 2),
			String(c.pixelCount)
		].join(","));

		// Optional totals row
		const totalLen = perColor.reduce((s, c) => s + c.yarnLength_m, 0);
		const totalW = perColor.reduce((s, c) => s + c.yarnWeightWithWaste_g, 0);
		const totalA = perColor.reduce((s, c) => s + c.areaCm2, 0);
		const totalCost = perColor.reduce((s, c) => s + (c.yarnCost || 0), 0);

		rows.push([
			"TOTAL",
			"",
			"",
			numFmt(convertMetricToDisplay("area", totalA), 2),
			numFmt(convertMetricToDisplay("yarnTotalLength", totalLen), 2),
			numFmt(convertMetricToDisplay("yarnWeightResult", totalW), 2),
			numFmt(totalCost, 2),
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
		const rugWidthInput = num(rugWidthEl.value);
		const rugHeightInput = num(rugHeightEl.value);
		const pileHeightInput = num(pileHeightEl.value);
		const linesInput = num(linesPerCmEl?.value);
		const stitchesInput = num(stitchesPerCmEl?.value);
		const yarnGPerMInput = posNumOrUndef(yarnGPerMEl.value);
		const yarnMPerKgInput = posNumOrUndef(yarnMPerKgEl.value);
		const yarnPriceInput = posNumOrUndef(yarnPricePerKgEl.value);
		const skeinWeightInput = posNumOrUndef(skeinWeightEl.value);

		return {
			mode: appState.mode,
			unitSystem: appState.unitSystem,
			rugWidthCm: convertDisplayToMetric("rugLength", rugWidthInput),
			rugHeightCm: convertDisplayToMetric("rugLength", rugHeightInput),
			lockAspect: !!lockAspectEl.checked,

			pileType: pileTypeEl.value || "cut",
			pileHeightMm: convertDisplayToMetric("pileHeight", pileHeightInput) || 0,

			densityPreset: densityPresetEl?.value || "medium",
			linesPerCm: convertDisplayToMetric("density", linesInput),
			stitchesPerCm: convertDisplayToMetric("density", stitchesInput),

			yarnName: yarnNameEl.value || "",
			strands: intDef(yarnStrandsEl.value, 2),
			yarnGPerM: yarnGPerMInput !== undefined ? convertDisplayToMetric("yarnWeightSpec", yarnGPerMInput) : undefined,
			yarnMPerKg: yarnMPerKgInput !== undefined ? convertDisplayToMetric("yarnLengthSpec", yarnMPerKgInput) : undefined,
			yarnPricePerKg: yarnPriceInput !== undefined ? convertDisplayToMetric("pricePerMass", yarnPriceInput) : undefined,
			skeinWeightG: skeinWeightInput !== undefined ? convertDisplayToMetric("skeinWeight", skeinWeightInput) : undefined,
			skeinPrice: posNumOrUndef(skeinPriceEl.value),
			wastagePercent: numDef(wastagePercentEl.value, 15),

			alphaThreshold: intDef(alphaThresholdEl.value, 10),
			minAreaPercent: numDef(minAreaPercentEl.value, 0.5),
			tolerance: intDef(colorTolerance.value, 40),
		};
	}

	function applySettings(s) {
		if (s.unitSystem && s.unitSystem !== appState.unitSystem) {
			setUnitSystem(s.unitSystem, { convertExistingValues: false, skipRefresh: true });
		}
		// Mode handled by setMode + radios
		setFieldFromMetric(rugWidthEl, s.rugWidthCm, "rugLength");
		setFieldFromMetric(rugHeightEl, s.rugHeightCm, "rugLength");

		setVal(pileTypeEl, s.pileType);
		setFieldFromMetric(pileHeightEl, s.pileHeightMm, "pileHeight");

		setVal(densityPresetEl, s.densityPreset);
		setFieldFromMetric(linesPerCmEl, s.linesPerCm, "density");
		setFieldFromMetric(stitchesPerCmEl, s.stitchesPerCm, "density");

		setVal(yarnNameEl, s.yarnName);
		setVal(yarnStrandsEl, s.strands);
		setFieldFromMetric(yarnGPerMEl, s.yarnGPerM, "yarnWeightSpec");
		setFieldFromMetric(yarnMPerKgEl, s.yarnMPerKg, "yarnLengthSpec");
		setFieldFromMetric(yarnPricePerKgEl, s.yarnPricePerKg, "pricePerMass");
		setFieldFromMetric(skeinWeightEl, s.skeinWeightG, "skeinWeight");
		setVal(skeinPriceEl, s.skeinPrice);
		setVal(wastagePercentEl, s.wastagePercent);

		setVal(alphaThresholdEl, s.alphaThreshold);
		setVal(minAreaPercentEl, s.minAreaPercent);
		setVal(colorTolerance, s.tolerance);
		colorToleranceValue.textContent = colorTolerance.value;

		if (typeof s.lockAspect === "boolean") {
			lockAspectEl.checked = s.lockAspect;
		}

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
		saveLastSettings({ ...s, mode: appState.mode, unitSystem: appState.unitSystem });
	}

	// helpers
	function num(v) { return Number(v || 0); }
	function numDef(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
	function intDef(v, d) { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; }
	function posNumOrUndef(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined; }
	function setVal(el, val) { if (!el) return; if (val === undefined || val === null) return; el.value = String(val); }
	function escapeHtml(s) { return (s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m])); }

	function getCurrentUnitSystemKey() {
		const key = appState.unitSystem || DEFAULT_UNIT_SYSTEM;
		return UNIT_CONVERSIONS.rugLength[key] ? key : DEFAULT_UNIT_SYSTEM;
	}

	function getCurrencyInfo() {
		return CURRENCY_INFO[getCurrentUnitSystemKey()] || CURRENCY_INFO[DEFAULT_UNIT_SYSTEM];
	}
	function getCurrencySymbol() { return getCurrencyInfo().symbol; }
	function getCurrencyCode() { return getCurrencyInfo().code; }

	function getUnitLabel(type) {
		const entry = UNIT_CONVERSIONS[type]?.[getCurrentUnitSystemKey()];
		return entry?.label || "";
	}
	function getUnitCsvLabel(type) {
		const entry = UNIT_CONVERSIONS[type]?.[getCurrentUnitSystemKey()];
		if (entry?.csv) return entry.csv;
		const label = entry?.label || type;
		return label.replace(/[^\w]/g, "").toLowerCase() || type;
	}

	function convertDisplayToMetric(type, value, systemKey = getCurrentUnitSystemKey()) {
		const entry = UNIT_CONVERSIONS[type]?.[systemKey];
		const numVal = Number(value);
		if (!entry || typeof entry.toMetric !== "function" || !Number.isFinite(numVal)) return numVal;
		return entry.toMetric(numVal);
	}

	function convertMetricToDisplay(type, value, systemKey = getCurrentUnitSystemKey()) {
		const entry = UNIT_CONVERSIONS[type]?.[systemKey];
		const numVal = Number(value);
		if (!Number.isFinite(numVal)) return numVal;
		if (!entry || typeof entry.fromMetric !== "function") return numVal;
		return entry.fromMetric(numVal);
	}

	function formatNumber(value, decimals = 2) {
		if (!Number.isFinite(value)) return "";
		let v = Math.abs(value) < 1e-9 ? 0 : value;
		if (typeof decimals === "number") {
			let str = v.toFixed(decimals);
			if (decimals > 0) {
				str = str.replace(/(\.\d*?[1-9])0+$/, "$1");
				str = str.replace(/\.0+$/, "");
			}
			return str;
		}
		return String(v);
	}

	function formatValueForDisplay(value, type, { useLocale = false, decimals } = {}) {
		const converted = convertMetricToDisplay(type, value);
		if (!Number.isFinite(converted)) return "";
		const entry = UNIT_CONVERSIONS[type]?.[getCurrentUnitSystemKey()];
		const digits = decimals ?? entry?.decimals ?? 2;
		if (useLocale) {
			return converted.toLocaleString(undefined, { maximumFractionDigits: digits });
		}
		return formatNumber(converted, digits);
	}

	function setFieldFromMetric(el, metricValue, type) {
		if (!el || metricValue === undefined || metricValue === null) return;
		const converted = convertMetricToDisplay(type, metricValue);
		if (!Number.isFinite(converted)) return;
		const entry = UNIT_CONVERSIONS[type]?.[getCurrentUnitSystemKey()];
		el.value = formatNumber(converted, entry?.decimals ?? 2);
	}

	function setUnitSystem(system, { convertExistingValues = true, skipRefresh = false } = {}) {
		const target = UNIT_CONVERSIONS.rugLength[system] ? system : DEFAULT_UNIT_SYSTEM;
		const prev = getCurrentUnitSystemKey();
		if (convertExistingValues && prev !== target) {
			convertFieldsBetweenSystems(prev, target);
		}
		appState.unitSystem = target;
		if (unitSystemEl) unitSystemEl.value = target;
		updateUnitLabels();
		if (!skipRefresh) refreshUnitsUI();
	}

	function convertFieldsBetweenSystems(fromSystem, toSystem) {
		if (!fromSystem || !toSystem || fromSystem === toSystem) return;
		const fields = [
			{ el: rugWidthEl, type: "rugLength" },
			{ el: rugHeightEl, type: "rugLength" },
			{ el: pileHeightEl, type: "pileHeight" },
			{ el: linesPerCmEl, type: "density" },
			{ el: stitchesPerCmEl, type: "density" },
			{ el: yarnGPerMEl, type: "yarnWeightSpec" },
			{ el: yarnMPerKgEl, type: "yarnLengthSpec" },
			{ el: yarnPricePerKgEl, type: "pricePerMass" },
			{ el: skeinWeightEl, type: "skeinWeight" },
			{ el: yhLenM, type: "helperLength" },
			{ el: yhWtG, type: "helperWeight" },
			{ el: yhM100, type: "helperLengthPerMass" }
		];
		fields.forEach(({ el, type }) => convertFieldValueBetweenSystems(el, type, fromSystem, toSystem));
	}

	function convertFieldValueBetweenSystems(el, type, fromSystem, toSystem) {
		if (!el || !UNIT_CONVERSIONS[type]) return;
		const fromEntry = UNIT_CONVERSIONS[type][fromSystem];
		const toEntry = UNIT_CONVERSIONS[type][toSystem];
		if (!fromEntry || !toEntry || typeof fromEntry.toMetric !== "function" || typeof toEntry.fromMetric !== "function") return;
		const rawStr = el.value;
		if (rawStr === undefined || rawStr === null || rawStr === "") return;
		const raw = Number(rawStr);
		if (!Number.isFinite(raw)) return;
		const base = fromEntry.toMetric(raw);
		if (!Number.isFinite(base)) return;
		const converted = toEntry.fromMetric(base);
		el.value = formatNumber(converted, toEntry.decimals ?? 2);
	}

	function updateUnitLabels() {
		const system = getCurrentUnitSystemKey();
		Object.entries(LABEL_TEXT).forEach(([key, map]) => {
			const el = labelEls[key];
			if (el && map && map[system]) {
				el.textContent = map[system];
			}
		});
		if (pileHeightEl) pileHeightEl.step = system === "imperial" ? "0.01" : "1";
		if (skeinWeightEl) skeinWeightEl.step = system === "imperial" ? "0.1" : "1";
		if (yhWtG) yhWtG.step = system === "imperial" ? "0.1" : "1";
		if (yhLenM) yhLenM.step = system === "imperial" ? "0.1" : "1";
		if (skeinWeightEl) skeinWeightEl.placeholder = system === "imperial" ? "e.g. 3.5" : "e.g. 100";
		if (yhWtG) yhWtG.placeholder = system === "imperial" ? "e.g. 3.5" : "e.g. 100";
		if (yhLenM) yhLenM.placeholder = system === "imperial" ? "e.g. 275" : "e.g. 250";
		if (yhM100) yhM100.placeholder = system === "imperial" ? "e.g. 1600" : "e.g. 250";
		if (yarnPricePerKgEl) yarnPricePerKgEl.placeholder = system === "imperial" ? "e.g. 12.50" : "e.g. 25.00";
	}

	function refreshUnitsUI() {
		if (lastRenderPayload) {
			renderSummary(resultsSummary, lastRenderPayload);
		}
		if (lastPerColor?.length) {
			renderYarnTable(resultsColors, lastPerColor);
		}
	}

	/* -------------------------- Summary/Results UI ------------------------- */
	function renderSummary(container, { clusters, totals, dropped, yarn } = {}) {
		const fmtLocale = (value, type, digits = 2) => formatValueForDisplay(value, type, { useLocale: true, decimals: digits }) || "0";
		const fmtPlain = (value, digits = 0) => {
			const n = Number(value ?? 0);
			return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : "0";
		};
		const areaLabel = getUnitLabel("area");
		const lengthLabel = getUnitLabel("yarnTotalLength");
		const weightLabel = getUnitLabel("yarnWeightResult");
		const currencySymbol = getCurrencySymbol();
		const totalColors = clusters?.length ?? 0;
		const droppedInfo = dropped && dropped.length ? ` (dropped ${dropped.length} tiny group${dropped.length > 1 ? 's' : ''})` : '';
		const totalLen = yarn?.totals?.totalLength_m ?? 0;
		const totalW = yarn?.totals?.totalWeightWithWaste_g ?? 0;
		const totalCost = yarn?.totals?.totalCost ?? 0;
		const hasCost = totalCost > 0.0001;
		const totalsObj = totals || {};

		container.innerHTML = `
    <p><strong>Detected colors:</strong> ${totalColors}${droppedInfo}</p>
    <p><strong>Image size:</strong> ${previewCanvas.width}×${previewCanvas.height} px
       &nbsp;|&nbsp; <strong>Valid pixels:</strong> ${fmtPlain(totalsObj.pixelsValid, 0)}</p>
    <p><strong>Rug bounding box area:</strong> ${fmtLocale(totalsObj.boxAreaCm2, "area")}
       ${areaLabel}
       &nbsp;|&nbsp; <strong>Estimated tufted area:</strong> ${fmtLocale(totalsObj.areaCm2, "area")} ${areaLabel}</p>
    <p><strong>Yarn (all strands, incl. wastage):</strong>
       ${fmtLocale(totalLen, "yarnTotalLength")}
       ${lengthLabel} &nbsp;|&nbsp; ${fmtLocale(totalW, "yarnWeightResult")} ${weightLabel}
       ${hasCost ? `&nbsp;|&nbsp; ~${fmtPlain(totalCost, 2)} ${currencySymbol}` : ""}</p>
  `;

	}

	function renderYarnTable(container, perColor) {
		lastPerColor = perColor || [];

		if (!lastPerColor.length) {
			container.innerHTML = `<p>No color groups above the minimum area threshold.</p>`;
			return;
		}

		const areaHeader = `Area (${getUnitLabel("area")})`;
		const lengthHeader = `Yarn (${getUnitLabel("yarnTotalLength")})`;
		const weightHeader = `Weight (${getUnitLabel("yarnWeightResult")}, incl. waste)`;
		const costHeader = `Cost (${getCurrencySymbol()})`;
		const rows = lastPerColor.map((c, idx) => {
			const pct = c.percentValid.toFixed(2);
			const area = formatValueForDisplay(c.areaCm2, "area");
			const len = formatValueForDisplay(c.yarnLength_m, "yarnTotalLength");
			const w = formatValueForDisplay(c.yarnWeightWithWaste_g, "yarnWeightResult");
			const cost = c.yarnCost ? Number(c.yarnCost).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "";
			const name = colorNames.get(c.hex) || "";
			const selectedClass = selectedColorIdxs.has(idx) ? " color-row-selected" : "";
			return `
	<tr data-row="${idx}" class="color-row${selectedClass}">
	  <td style="white-space:nowrap;">
	    <span class="swatch" style="background:${c.hex}; border:1px solid #ccc; width:18px; height:18px; display:inline-block; vertical-align:middle; margin-right:8px; border-radius:3px;"></span>
	    ${c.hex.toUpperCase()} ${name ? `&nbsp;<em style="color:#555;">(${escapeHtml(name)})</em>` : ""}
	  </td>
	  <td style="text-align:right;">${pct}%</td>
	  <td style="text-align:right;">${area}</td>
	  <td style="text-align:right;">${len}</td>
	  <td style="text-align:right;">${w}</td>
	  <td style="text-align:right;">${cost}</td>
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
	      <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">${areaHeader}</th>
	      <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">${lengthHeader}</th>
	      <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">${weightHeader}</th>
	      <th style="text-align:right; border-bottom:1px solid #eee; padding-bottom:6px;">${costHeader}</th>
	    </tr>
	  </thead>
	  <tbody>${rows}</tbody>
	</table>
      </div>
      <p class="hint" style="margin-top:0.5rem;">
	Click rows (or the preview) to select colors. Ctrl/Cmd-click for multi-select.
      </p>
    `;

		// Rebind selection behavior for table rows
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

		// Keep legend’s active states in sync when table re-renders
		refreshLegendActive();
	}


	function renderLegend(container, perColor) {
		container.innerHTML = "";
		if (!perColor?.length) return;

		perColor.forEach((c, idx) => {
			const item = document.createElement("div");
			item.className = "legend-item";
			if (selectedColorIdxs.has(idx)) item.classList.add("active");

			const sw = document.createElement("span");
			sw.className = "sw";
			sw.style.background = c.hex;
			const label = document.createElement("span");
			label.textContent = (colorNames.get(c.hex) || c.hex.toUpperCase());

			item.appendChild(sw);
			item.appendChild(label);
			item.title = `${c.hex.toUpperCase()} — ${c.percentValid.toFixed(2)}%`;
			item.addEventListener("click", () => {
				if (selectedColorIdxs.has(idx)) selectedColorIdxs.delete(idx);
				else selectedColorIdxs.add(idx);
				// Re-render legend + table selection state
				renderLegend(container, lastPerColor);
				const containerTbl = document.getElementById("results-colors");
				renderYarnTable(containerTbl, lastPerColor);
				drawOverlay();
			});

			container.appendChild(item);
		});
		updateActionButtons();
	}

	// Re-apply active class in legend
	function refreshLegendActive() {
		const items = legendEl.querySelectorAll(".legend-item");
		items.forEach((el, i) => {
			if (selectedColorIdxs.has(i)) el.classList.add("active");
			else el.classList.remove("active");
		});
	}

	function selectRow(tr, idx) {
		selectedColorIdxs.add(idx);
		tr.classList.add("color-row-selected");
		refreshLegendActive();
		drawOverlay();
		updateActionButtons();
	}

	function toggleSelectRow(tr, idx) {
		if (selectedColorIdxs.has(idx)) {
			selectedColorIdxs.delete(idx);
			tr.classList.remove("color-row-selected");
		} else {
			selectedColorIdxs.add(idx);
			tr.classList.add("color-row-selected");
		}
		refreshLegendActive();
		drawOverlay();
		updateActionButtons();
	}

	function clearSelection(tbody) {
		selectedColorIdxs.clear();
		tbody.querySelectorAll("tr.color-row-selected").forEach(tr => tr.classList.remove("color-row-selected"));
		refreshLegendActive();
		drawOverlay();
		updateActionButtons();
	}

	function rangeSelectRow(tbody, idx) {
		const existing = [...selectedColorIdxs].sort((a, b) => a - b);
		const anchor = existing.length ? existing[existing.length - 1] : idx;
		const [lo, hi] = [Math.min(anchor, idx), Math.max(anchor, idx)];
		clearSelection(tbody);
		for (let i = lo; i <= hi; i++) {
			const row = tbody.querySelector(`tr[data-row="${i}"]`);
			if (row) selectRow(row, i);
		}
		updateActionButtons();
	}


	overlayModeEl.addEventListener("change", drawOverlay);
	overlayDimEl.addEventListener("input", drawOverlay);

	function drawOverlay() {
		if (!baseImageData) return;

		const mode = overlayModeEl.value; // none | highlight | isolate | hide
		const dimPct = Math.max(0, Math.min(95, Number(overlayDimEl.value || 70)));
		const dimFactor = 1 - dimPct / 100;

		const ctx = previewCanvas.getContext("2d");
		// Start from clean image
		ctx.putImageData(baseImageData, 0, 0);

		// If we have a selection and a mode != none, keep existing behavior
		const hasSelection = selectedColorIdxs.size > 0;
		const canHoverHighlight = (!hasSelection && mode === "none" && analysisLabels && hoverClusterIdx >= 0);

		if (!analysisLabels) return;

		if (!hasSelection && mode === "none" && !canHoverHighlight) {
			// no selection, no overlay, nothing to do
			return;
		}

		const img = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
		const data = img.data;
		const labels = analysisLabels;

		// Safety
		if (labels.length !== (img.width * img.height)) {
			ctx.putImageData(img, 0, 0);
			return;
		}

		// Hover-only dim factor (softer than the main dim)
		const hoverDimFactor = 0.5; // 50% brightness for non-hovered pixels

		// Fast membership check
		const selected = hasSelection ? new Set(selectedColorIdxs) : null;

		for (let i = 0, p = 0; i < labels.length; i++, p += 4) {
			const lab = labels[i]; // -1 transparent/ignored
			if (lab < 0) continue;

			if (canHoverHighlight) {
				// Dim everything except the hovered cluster
				if (lab !== hoverClusterIdx) {
					data[p] = Math.round(data[p] * hoverDimFactor);
					data[p + 1] = Math.round(data[p + 1] * hoverDimFactor);
					data[p + 2] = Math.round(data[p + 2] * hoverDimFactor);
				}
				continue;
			}

			// Existing overlay behaviors when there is a selection or mode != none
			if (!hasSelection) continue;

			const isSel = selected.has(lab);

			if (mode === "highlight") {
				if (!isSel) {
					data[p] = Math.round(data[p] * dimFactor);
					data[p + 1] = Math.round(data[p + 1] * dimFactor);
					data[p + 2] = Math.round(data[p + 2] * dimFactor);
				}
			} else if (mode === "isolate") {
				if (!isSel) {
					data[p + 3] = Math.round(data[p + 3] * dimFactor); // fade alpha
				}
			} else if (mode === "hide") {
				if (isSel) {
					data[p + 3] = 0; // hide selected
				}
			}
		}

		ctx.putImageData(img, 0, 0);
	}

	function exportToPDF() {
		// jsPDF in UMD
		const { jsPDF } = window.jspdf;
		const doc = new jsPDF({ unit: "pt", format: "a4" });
		const margin = 36; // 0.5 inch
		const pageWidth = doc.internal.pageSize.getWidth();
		let y = margin;

		// --- Title & meta
		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.text("Tufting Yarn Estimate", margin, y);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		const when = new Date().toLocaleString();
		doc.text(`Generated: ${when}`, pageWidth - margin, y, { align: "right" });
		y += 18;

		// --- Image thumbnail (from preview canvas)
		if (previewCanvas && previewCanvas.width && previewCanvas.height) {
			const maxW = 240, maxH = 180;
			const ratio = Math.min(maxW / previewCanvas.width, maxH / previewCanvas.height, 1);
			const w = Math.round(previewCanvas.width * ratio);
			const h = Math.round(previewCanvas.height * ratio);
			const dataUrl = previewCanvas.toDataURL("image/png", 0.92);
			doc.addImage(dataUrl, "PNG", margin, y, w, h);
		}

		// --- Parameters block
		const params = readForm(); // existing helper in your app
		const rugUnit = getUnitLabel("rugLength");
		const pileUnit = getUnitLabel("pileHeight");
		const densityUnit = getUnitLabel("density");
		const priceUnit = getUnitLabel("pricePerMass");
		const skeinUnit = getUnitLabel("skeinWeight");
		const areaLabel = getUnitLabel("area");
		const lengthLabel = getUnitLabel("yarnTotalLength");
		const weightLabel = getUnitLabel("yarnWeightResult");
		const currencySymbol = getCurrencySymbol();
		const paramLines = [
			`Mode: ${params.mode === "advanced" ? "Advanced" : "Beginner"}`,
			`Rug size: ${fmtDisplay(params.rugWidthCm, "rugLength")} × ${fmtDisplay(params.rugHeightCm, "rugLength")} ${rugUnit}`,
			`Pile: ${params.pileType}, ${fmtDisplay(params.pileHeightMm, "pileHeight")} ${pileUnit}`,
			params.mode === "advanced"
				? `Density: ${fmtDisplay(params.linesPerCm, "density")} lines/${densityUnit} × ${fmtDisplay(params.stitchesPerCm, "density")} stitches/${densityUnit}`
				: `Density preset: ${params.densityPreset}`,
			`Yarn: ${params.yarnName || "—"} | Strands: ${params.strands}`,
			params.yarnGPerM
				? `Yarn weight: ${fmtDisplay(params.yarnGPerM, "yarnWeightSpec")} ${getUnitLabel("yarnWeightSpec")}`
				: params.yarnMPerKg
					? `Yarn length: ${fmtDisplay(params.yarnMPerKg, "yarnLengthSpec")} ${getUnitLabel("yarnLengthSpec")}`
					: `Yarn spec: default (set in app)`,
			`Wastage: ${fmt(params.wastagePercent)}%`,
			`Tolerance: ${params.tolerance}`,
			`Min area: ${fmt(params.minAreaPercent)}%`,
			`Alpha <= ${params.alphaThreshold} ignored`
		];

		if (params.yarnPricePerKg && params.yarnPricePerKg > 0) {
			paramLines.push(`Yarn price: ${currencySymbol}${fmtDisplay(params.yarnPricePerKg, "pricePerMass")} ${priceUnit}`);
		} else if (
			params.skeinWeightG &&
			params.skeinWeightG > 0 &&
			params.skeinPrice &&
			params.skeinPrice > 0
		) {
			const pricePerKg = (params.skeinPrice / params.skeinWeightG) * 1000;
			paramLines.push(
				`Yarn price: ${currencySymbol}${fmtDisplay(pricePerKg, "pricePerMass")} ${priceUnit} (from ${fmtDisplay(params.skeinWeightG, "skeinWeight")} ${skeinUnit} @ ${currencySymbol}${formatNumber(params.skeinPrice, 2)})`
			);
		}

		const colX = margin + 260; // to the right of thumbnail
		y += 4;
		doc.setFont("helvetica", "bold");
		doc.setFontSize(12);
		doc.text("Parameters", colX, y);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		y += 14;
		paramLines.forEach(line => {
			doc.text(line, colX, y);
			y += 12;
		});

		// --- Totals
		const totalLen = lastPerColor.reduce((s, c) => s + c.yarnLength_m, 0);
		const totalW = lastPerColor.reduce((s, c) => s + c.yarnWeightWithWaste_g, 0);
		const totalA = lastPerColor.reduce((s, c) => s + c.areaCm2, 0);
		const totalCost = lastPerColor.reduce((s, c) => s + (c.yarnCost || 0), 0);


		y += 4;
		doc.setFont("helvetica", "bold");
		doc.text("Totals", colX, y);
		doc.setFont("helvetica", "normal");
		y += 14;
		doc.text(`Area (kept colors): ${fmtDisplay(totalA, "area")} ${areaLabel}`, colX, y); y += 12;
		doc.text(`Yarn length (all strands): ${fmtDisplay(totalLen, "yarnTotalLength")} ${lengthLabel}`, colX, y); y += 12;
		doc.text(`Weight incl. wastage: ${fmtDisplay(totalW, "yarnWeightResult")} ${weightLabel}`, colX, y); y += 12;
		if (totalCost > 0.0001) {
			doc.text(`Yarn cost: ~${currencySymbol}${formatNumber(totalCost, 2)}`, colX, y); y += 12;
		}

		// Move below image if needed
		const belowImageY = margin + 180 + 16;
		y = Math.max(y, belowImageY);

		// --- Palette table with AutoTable
		const rows = lastPerColor.map((c, i) => {
			const name = colorNames.get(c.hex) || "";
			return {
				swatch: c.hex,                 // we'll draw the square in didDrawCell
				color: name ? `${c.hex.toUpperCase()} (${name})` : c.hex.toUpperCase(),
				percent: `${formatNumber(c.percentValid, 2)}%`,
				area: formatValueForDisplay(c.areaCm2, "area"),
				yarnm: formatValueForDisplay(c.yarnLength_m, "yarnTotalLength"),
				weightg: formatValueForDisplay(c.yarnWeightWithWaste_g, "yarnWeightResult"),
				pixels: c.pixelCount.toLocaleString(),
				cost: c.yarnCost ? formatNumber(c.yarnCost, 2) : "",
			};
		});

		doc.setFont("helvetica", "bold");
		doc.setFontSize(12);
		doc.text("Per-color usage", margin, y);
		y += 8;

		doc.autoTable({
			startY: y + 6,
			styles: { font: "helvetica", fontSize: 9, cellPadding: 4, overflow: "linebreak" },
			headStyles: { fillColor: [37, 99, 235] },
			columnStyles: {
				swatch: { cellWidth: 18 } // keep the swatch column tight
			},
			columns: [
				{ header: "", dataKey: "swatch" }, // no header text for the swatch
				{ header: "Color", dataKey: "color" },
				{ header: "% of valid", dataKey: "percent" },
				{ header: `Area (${areaLabel})`, dataKey: "area" },
				{ header: `Yarn (${lengthLabel})`, dataKey: "yarnm" },
				{ header: `Weight (${weightLabel}, incl. waste)`, dataKey: "weightg" },
				{ header: "Pixels", dataKey: "pixels" },
				{ header: `Cost (${currencySymbol})`, dataKey: "cost" }
			],
			body: rows,

			// 1) Remove text content in the swatch cell (head + body)
			didParseCell: (data) => {
				if (data.column.dataKey === "swatch") {
					data.cell.text = []; // <- hides the hex string (or any text)
				}
			},

			// 2) Draw the color box only for body rows (guarded)
			didDrawCell: (data) => {
				if (data.section !== "body" || data.column.dataKey !== "swatch") return;

				const hex = typeof data.cell.raw === "string" ? data.cell.raw.trim() : "";
				const rgb = hexToRgbSafe(hex);
				if (!rgb) return;

				const { x, y, height } = data.cell;
				const size = Math.min(12, height - 4);
				const pad = (height - size) / 2;

				doc.setDrawColor(204, 204, 204);
				doc.setFillColor(rgb.r, rgb.g, rgb.b);
				doc.rect(x + 4, y + pad, size, size, "FD");
			}
		});

		// --- Footer mini-note
		const endY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 24;
		doc.setFontSize(8);
		doc.setTextColor(120);
		doc.text("Generated with Tufting Yarn Calculator", margin, endY);

		// --- Save
		const safeName = (params.yarnName || "project").replace(/[^\w\-]+/g, "_");
		doc.save(`tufting_yarn_${safeName}.pdf`);

		// helpers
		function fmt(n, d = 2) {
			const v = Number(n);
			if (!Number.isFinite(v)) return "—";
			return v.toLocaleString(undefined, { maximumFractionDigits: d });
		}
		function fmtDisplay(value, type) {
			return formatValueForDisplay(value, type, { useLocale: false }) || "—";
		}
		function hexToRgb(hex) {
			const v = hex.replace("#", "");
			const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
			return { r, g, b };
		}
		function hexToRgbSafe(hex) {
			if (typeof hex !== "string") return null;
			let v = hex.trim();

			// Allow "#rrggbb" or "rrggbb" — normalize
			if (v.startsWith("#")) v = v.slice(1);

			// Expand #rgb → #rrggbb if needed
			if (v.length === 3) {
				v = v.split("").map(ch => ch + ch).join("");
			}

			// Must be exactly 6 hex chars
			if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;

			const r = parseInt(v.slice(0, 2), 16);
			const g = parseInt(v.slice(2, 4), 16);
			const b = parseInt(v.slice(4, 6), 16);
			return { r, g, b };
		}

	}

	function updateActionButtons() {
		const selectionCount = selectedColorIdxs.size;
		// Enable Rename only when exactly one row is selected
		renameBtn.disabled = !(selectionCount === 1);
		// Enable Merge when 2+ rows are selected
		mergeBtn.disabled = !(selectionCount >= 2);
		// Enable exports when we have results
		const hasRows = lastPerColor && lastPerColor.length > 0;
		exportCsvBtn.disabled = !hasRows;
		exportPdfBtn.disabled = !hasRows;
	}

	updateActionButtons();

});
