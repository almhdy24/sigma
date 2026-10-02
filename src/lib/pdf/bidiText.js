// Converts logical-order text to the visual left-to-right order that PDF
// text drawing needs, using a complete Unicode Bidi Algorithm (bidi-js).
// Arabic is shaped *before* reordering (shaping depends on logical
// neighbours), which is why this runs on jsPDF's processArabic output.

const RTL_CHARS = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
// Invisible direction marks (e.g. U+200F in Arabic dates) are resolved here
// and would otherwise render as boxes or confuse the layout.
const BIDI_CONTROLS = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;

/**
 * @param {object} bidi  instance from bidi-js' factory
 * @param {(s: string) => string} shape  Arabic shaper (jsPDF processArabic)
 * @returns {(text: string, direction?: 'ltr'|'rtl'|'auto') => string}
 */
export function createVisualizer(bidi, shape) {
  return function toVisual(text, direction = 'auto') {
    const input = String(text ?? '');
    if (!RTL_CHARS.test(input)) return input.replace(BIDI_CONTROLS, '');
    const shaped = shape(input.replace(BIDI_CONTROLS, ''));
    const levels = bidi.getEmbeddingLevels(shaped, direction === 'auto' ? undefined : direction);
    const chars = shaped.split('');
    // Note: the mirroring helper takes the raw levels array, not the result object.
    bidi.getMirroredCharactersMap(shaped, levels.levels).forEach((ch, i) => { chars[i] = ch; });
    for (const [start, end] of bidi.getReorderSegments(shaped, levels)) {
      const reversed = chars.slice(start, end + 1).reverse();
      chars.splice(start, reversed.length, ...reversed);
    }
    return chars.join('');
  };
}

/** Base direction of a paragraph from its first strong character. */
export function baseDirection(text) {
  const m = String(text ?? '').match(/[A-Za-z\u00C0-\u024F\u0370-\u03FF]|[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/);
  return m && RTL_CHARS.test(m[0]) ? 'rtl' : 'ltr';
}
