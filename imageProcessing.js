// imageProcessing.js
// Color analysis with Lab distance + tolerance-based clustering

export function analyzeImage(canvas, {
  alphaThreshold = 10,
  tolerance = 40,          // 0..100 UI slider -> we’ll map to a Lab ∆E threshold
  minAreaPercent = 0.5,    // clusters smaller than this % are dropped
  rugWidthCm = 0,
  rugHeightCm = 0,
}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  if (!width || !height) {
    return { clusters: [], totals: { pixelsTotal: 0, pixelsValid: 0, areaCm2: 0 } };
  }

  // 1) Read pixels
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 2) Map UI tolerance 0..100 → a Lab ∆E threshold (rough mapping)
  //    Smaller ∆E = stricter clustering
  const deltaEMin = 3;   // very strict
  const deltaEMax = 50;  // very tolerant
  const deltaEThreshold = deltaEMin + (deltaEMax - deltaEMin) * (tolerance / 100);

  // 3) Scan pixels, ignore transparent, cluster by closest centroid within ∆E threshold
  const clusters = [];
  let pixelsTotal = width * height;
  let pixelsValid = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a <= alphaThreshold) continue;
    pixelsValid++;

    // Convert to Lab for perceptual distance
    const lab = rgbToLab(r, g, b);

    // Find nearest cluster within threshold
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const d = deltaE76(lab, clusters[c].labMean);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = c;
      }
    }

    if (bestIdx >= 0 && bestDist <= deltaEThreshold) {
      // add to cluster
      const cl = clusters[bestIdx];
      cl.count++;
      // update running means in both RGB and Lab for a stable representative color
      cl.rgbSum[0] += r; cl.rgbSum[1] += g; cl.rgbSum[2] += b;
      cl.labSum[0] += lab[0]; cl.labSum[1] += lab[1]; cl.labSum[2] += lab[2];
      cl.labMean = [
        cl.labSum[0] / cl.count,
        cl.labSum[1] / cl.count,
        cl.labSum[2] / cl.count
      ];
    } else {
      clusters.push({
        count: 1,
        rgbSum: [r, g, b],
        labSum: [lab[0], lab[1], lab[2]],
        labMean: [lab[0], lab[1], lab[2]],
      });
    }
  }

  // 4) Compute area mapping:
  //    We assume rugWidthCm × rugHeightCm is the physical bounding box.
  //    area_per_pixel = box_area_cm2 / total_pixels (including transparent).
  const boxAreaCm2 = Math.max(0, rugWidthCm) * Math.max(0, rugHeightCm);
  const areaPerPixel = pixelsTotal > 0 ? boxAreaCm2 / pixelsTotal : 0;

  // 5) Build results with representative color + percentages + cm²
  let totalKeptPixels = 0;
  const clustersDetailed = clusters.map(c => {
    const rgb = [
      Math.round(c.rgbSum[0] / c.count),
      Math.round(c.rgbSum[1] / c.count),
      Math.round(c.rgbSum[2] / c.count)
    ];
    const pct = pixelsValid > 0 ? (100 * c.count / pixelsValid) : 0;
    const areaCm2 = c.count * areaPerPixel;
    return {
      rgb,
      hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
      pixelCount: c.count,
      percentValid: pct,
      areaCm2,
    };
  });

  // 6) Filter by min area percent (of VALID pixels)
  const kept = [];
  const dropped = [];
  for (const c of clustersDetailed) {
    if (c.percentValid >= minAreaPercent) {
      kept.push(c);
      totalKeptPixels += c.pixelCount;
    } else {
      dropped.push(c);
    }
  }

  // Sort kept by descending area
  kept.sort((a, b) => b.pixelCount - a.pixelCount);

  const totals = {
    pixelsTotal,
    pixelsValid,
    pixelsKept: totalKeptPixels,
    areaCm2: kept.reduce((s, c) => s + c.areaCm2, 0),
    boxAreaCm2,
    areaPerPixel,
    droppedCount: dropped.length,
  };

  return { clusters: kept, dropped, totals };
}

/* ------------------------------ Color utils ------------------------------ */

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// sRGB (0..255) → linearized 0..1
function srgbToLinear(c) {
  c = c / 255;
  return (c <= 0.04045) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
}

// RGB → XYZ (D65)
function rgbToXyz(r, g, b) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  // sRGB D65 matrix
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return [x, y, z];
}

// XYZ → Lab (CIELAB, D65 white)
function xyzToLab(x, y, z) {
  // D65 reference white
  const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;

  let fx = fLab(x / Xn);
  let fy = fLab(y / Yn);
  let fz = fLab(z / Zn);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
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

// ∆E*76 (simple)
function deltaE76(lab1, lab2) {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

