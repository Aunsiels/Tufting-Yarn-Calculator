// storage.js
// Tiny wrapper around localStorage for settings & presets.

const SETTINGS_KEY = "tyc:lastSettings:v1";
const PRESETS_KEY = "tyc:presets:v1";
const PALETTES_KEY = "tyc:palettes:v1";

export function loadLastSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveLastSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { }
}

export function clearLastSettings() {
  try { localStorage.removeItem(SETTINGS_KEY); } catch { }
}

export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePreset(name, settings) {
  const presets = loadPresets();
  const idx = presets.findIndex(p => p.name === name);
  const payload = { name, settings, savedAt: Date.now() };
  if (idx >= 0) presets[idx] = payload; else presets.push(payload);
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch { }
}

export function deletePreset(name) {
  const presets = loadPresets().filter(p => p.name !== name);
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch { }
}

export function loadColorPalettes() {
  try {
    const raw = localStorage.getItem(PALETTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveColorPalette(name, colors) {
  const palettes = loadColorPalettes();
  const idx = palettes.findIndex(p => p.name === name);
  const payload = { name, colors, savedAt: Date.now() };
  if (idx >= 0) palettes[idx] = payload; else palettes.push(payload);
  try { localStorage.setItem(PALETTES_KEY, JSON.stringify(palettes)); } catch { }
}

export function deleteColorPalette(name) {
  const palettes = loadColorPalettes().filter(p => p.name !== name);
  try { localStorage.setItem(PALETTES_KEY, JSON.stringify(palettes)); } catch { }
}
