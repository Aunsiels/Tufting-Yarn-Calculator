// imageProcessing.js
// Color analysis with Lab distance + tolerance-based clustering
export function analyzeImage(canvas, {
  alphaThreshold = 10,
  tolerance = 40,          // 0..100 UI slider -> mapped to Lab ∆E
  minAreaCm2 = 0.5,        // clusters smaller than this area (cm²) are dropped
  rugWidthCm = 0,
  rugHeightCm = 0,
}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  if (!width || !height) {
    return {
      clusters: [], dropped: [],
      totals: { pixelsTotal: 0, pixelsValid: 0, pixelsKept: 0, areaCm2: 0, boxAreaCm2: 0, areaPerPixel: 0, droppedCount: 0 },
      labels: null, size: { width, height }
    };
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Map UI tolerance to a Lab ∆E threshold
  const deltaEMin = 3, deltaEMax = 50;
  const deltaEThreshold = deltaEMin + (deltaEMax - deltaEMin) * (tolerance / 100);

  const clusters = [];
  const rawLabel = new Int16Array(width * height);
  rawLabel.fill(-1);

  let pixelsTotal = width * height;
  let pixelsValid = 0;

  // First pass: cluster + assign provisional labels
  for (let p = 0, idx = 0; p < data.length; p += 4, idx++) {
    const r = data[p], g = data[p + 1], b = data[p + 2], a = data[p + 3];
    if (a <= alphaThreshold) continue;

    pixelsValid++;
    const lab = rgbToLab(r, g, b);

    let bestIdx = -1, bestDist = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const d = deltaE76(lab, clusters[c].labMean);
      if (d < bestDist) { bestDist = d; bestIdx = c; }
    }

    if (bestIdx >= 0 && bestDist <= deltaEThreshold) {
      const cl = clusters[bestIdx];
      cl.count++;
      cl.rgbSum[0] += r; cl.rgbSum[1] += g; cl.rgbSum[2] += b;
      cl.labSum[0] += lab[0]; cl.labSum[1] += lab[1]; cl.labSum[2] += lab[2];
      cl.labMean = [cl.labSum[0] / cl.count, cl.labSum[1] / cl.count, cl.labSum[2] / cl.count];
      rawLabel[idx] = bestIdx;
    } else {
      const id = clusters.length;
      clusters.push({
        id,
        count: 1,
        rgbSum: [r, g, b],
        labSum: [lab[0], lab[1], lab[2]],
        labMean: [lab[0], lab[1], lab[2]],
      });
      rawLabel[idx] = id;
    }
  }

  const boxAreaCm2 = Math.max(0, rugWidthCm) * Math.max(0, rugHeightCm);
  const areaPerPixel = pixelsTotal > 0 ? boxAreaCm2 / pixelsTotal : 0;
  const minArea = Math.max(0, minAreaCm2);
  const minPixels = areaPerPixel > 0 ? (minArea / areaPerPixel) : 0;

  // Build detailed clusters
  const detailed = clusters.map(c => {
    const rgb = [Math.round(c.rgbSum[0] / c.count), Math.round(c.rgbSum[1] / c.count), Math.round(c.rgbSum[2] / c.count)];
    const pct = pixelsValid > 0 ? (100 * c.count / pixelsValid) : 0;
    const areaCm2 = c.count * areaPerPixel;
    return { id: c.id, rgb, hex: rgbToHex(rgb[0], rgb[1], rgb[2]), pixelCount: c.count, percentValid: pct, areaCm2 };
  });

  // Filter by min area (converted to pixel count); keep all if rug size is unknown
  const kept = [], dropped = [];
  for (const c of detailed) {
    if (c.pixelCount >= minPixels) kept.push(c); else dropped.push(c);
  }
  kept.sort((a, b) => b.pixelCount - a.pixelCount);

  // Map raw cluster ids -> kept index (0..k-1), else -1
  const idToKept = new Map(kept.map((c, i) => [c.id, i]));
  const labels = new Int16Array(width * height);
  labels.fill(-1);
  let pixelsKept = 0;

  for (let i = 0; i < rawLabel.length; i++) {
    const rid = rawLabel[i];
    if (rid < 0) { labels[i] = -1; continue; }
    const mapped = idToKept.has(rid) ? idToKept.get(rid) : -1;
    labels[i] = (mapped ?? -1);
    if (labels[i] >= 0) pixelsKept++;
  }

  const totals = {
    pixelsTotal,
    pixelsValid,
    pixelsKept,
    areaCm2: kept.reduce((s, c) => s + c.areaCm2, 0),
    boxAreaCm2,
    areaPerPixel,
    droppedCount: dropped.length,
  };

  return { clusters: kept, dropped, totals, labels, size: { width, height } };
}

/* ------------------------------ Color utils ------------------------------ */

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function srgbToLinear(c) {
  c = c / 255;
  return (c <= 0.04045) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r, g, b) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return [x, y, z];
}

function xyzToLab(x, y, z) {
  const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
  let fx = fLab(x / Xn), fy = fLab(y / Yn), fz = fLab(z / Zn);
  const L = 116 * fy - 16, a = 500 * (fx - fy), b = 200 * (fy - fz);
  return [L, a, b];
}

function fLab(t) {
  const delta = 6 / 29;
  return t > Math.pow(delta, 3) ? Math.cbrt(t) : (t / (3 * delta * delta) + 4 / 29);
}

function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function deltaE76(lab1, lab2) {
  const dL = lab1[0] - lab2[0], da = lab1[1] - lab2[1], db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

export { rgbToLab, deltaE76 };
