export function formatMB(bytes, locale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
    .format(bytes / 1_000_000);
}
