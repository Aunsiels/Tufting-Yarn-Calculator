// calculation.js
// Compute yarn length & weight from areas and parameters (single yarn type per project).

/**
 * Compute yarn constants for the project.
 * - Supports Beginner (density preset) OR Advanced (lines/stitches per cm).
 * - Handles pile type/height, strands, wastage, and yarn g/m or m/kg.
 */
export function computeYarnConstants({
  mode,                  // "beginner" | "advanced"
  densityPreset,         // "low" | "medium" | "high"  (beginner)
  linesPerCm,            // number (advanced)
  stitchesPerCm,         // number (advanced)
  pileType,              // "cut" | "loop"
  pileHeightMm,          // number
  strands,               // integer >=1
  wastagePercent,        // e.g. 15
  yarnGPerM,             // number | undefined
  yarnMPerKg,            // number | undefined
}) {
  const pile_h_m = Math.max(0, Number(pileHeightMm || 0)) / 1000; // meters
  const s = Math.max(1, Math.round(Number(strands || 1)));
  const wastage = Math.max(0, Number(wastagePercent || 0)) / 100;

  // Convert yarn specs to grams per meter (single strand)
  let g_per_m_single;
  if (isFiniteNum(yarnGPerM) && yarnGPerM > 0) {
    g_per_m_single = Number(yarnGPerM);
  } else if (isFiniteNum(yarnMPerKg) && yarnMPerKg > 0) {
    // m/kg  -> g/m  (1 kg / m_per_kg = g per m)
    g_per_m_single = 1000 / Number(yarnMPerKg);
  } else {
    // Safe default if user hasn’t filled it yet (typical acrylic ~ 3–6 g per 10 m => 0.3–0.6 g/m)
    g_per_m_single = 0.5;
  }

  // Pile loop factor:
  // For a simple model, a loop or a cut "loop" consumes roughly ~2*h per stitch.
  // We keep a tiny difference to reflect some practical variation.
  const loopFactor = pileType === "loop" ? 0.95 : 1.0;

  // Compute yarn length per unit area (single strand), in m/cm²:
  // Two paths to L_area (m/cm²):
  // A) Advanced: based on user lines/stitches.
  //    L = backing_component + pile_component
  //      = 0.01 * lines/cm (m per cm²)  +  (2 * h * loopFactor) * (lines/cm * stitches/cm)  (m per cm²)
  //
  // B) Beginner: from density preset @ 12mm cut baseline ≈ 1200 m/m², scaled by pile height & pile type.
  //    multipliers: low=0.8, medium=1.0, high=1.25; pile height scales linearly; loop slight reduction.
  let L_m_per_cm2_single;

  if (mode === "advanced" && isFiniteNum(linesPerCm) && isFiniteNum(stitchesPerCm) && linesPerCm > 0 && stitchesPerCm > 0) {
    const L_backing = 0.01 * Number(linesPerCm); // m/cm²
    const stitches_per_cm2 = Number(linesPerCm) * Number(stitchesPerCm);
    const L_pile = (2 * pile_h_m * loopFactor) * stitches_per_cm2; // m/cm²
    L_m_per_cm2_single = L_backing + L_pile;
  } else {
    // Beginner preset path
    const presetMul = { low: 0.8, medium: 1.0, high: 1.25 }[densityPreset || "medium"] ?? 1.0;
    const baseline_m_per_m2_cut_12mm = 1200; // m/m² @ medium, cut, 12 mm
    const pileHeightMul = (pile_h_m > 0) ? (pile_h_m / 0.012) : 1.0; // scale to 12mm baseline
    const pileTypeMul = (pileType === "loop") ? 0.95 : 1.0;

    const m_per_m2_single = baseline_m_per_m2_cut_12mm * presetMul * pileHeightMul * pileTypeMul;
    L_m_per_cm2_single = m_per_m2_single / 10000; // m/cm²
  }

  return {
    g_per_m_single,
    strands: s,
    wastage,                  // fraction
    L_m_per_cm2_single,       // m per cm², single strand
  };
}

/**
 * Given clusters with area_cm2, compute yarn length & weight per color and totals.
 */
export function computeYarnForClusters(clusters, constants) {
  const {
    L_m_per_cm2_single,
    g_per_m_single,
    strands,
    wastage
  } = constants;

  const results = [];
  let totalLen_m = 0;
  let totalWeight_g = 0;
  let totalArea_cm2 = 0;

  for (const c of clusters) {
    const area = Number(c.areaCm2 || 0);
    const length_single = area * L_m_per_cm2_single; // m, single strand
    const length_all = length_single * strands;      // m, all strands together
    const weight_g = length_all * g_per_m_single;    // grams
    const weight_with_waste_g = weight_g * (1 + wastage);

    results.push({
      ...c,
      yarnLength_m_single: length_single,
      yarnLength_m: length_all,
      yarnWeight_g: weight_g,
      yarnWeightWithWaste_g: weight_with_waste_g,
    });

    totalLen_m += length_all;
    totalWeight_g += weight_with_waste_g;
    totalArea_cm2 += area;
  }

  return {
    perColor: results,
    totals: {
      totalArea_cm2,
      totalLength_m: totalLen_m,
      totalWeightWithWaste_g: totalWeight_g,
    }
  };
}

function isFiniteNum(x) {
  const n = Number(x);
  return Number.isFinite(n);
}

