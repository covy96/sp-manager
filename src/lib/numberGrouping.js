// In italiano Intl non mette il separatore delle migliaia sui numeri a 4 cifre
// (1000 invece di 1.000, regola CLDR "minimumGroupingDigits: 2").
// Qui rendiamo "always" il default per le lingue italiane, così ogni
// Intl.NumberFormat / toLocaleString dell'app mostra 1.000, 2.500 €, ecc.
// Se un formatter passa useGrouping esplicitamente, la sua scelta resta.

function isItalian(locales) {
  const first = Array.isArray(locales) ? locales[0] : locales;
  if (first == null) return (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase().startsWith("it");
  return String(first).toLowerCase().startsWith("it");
}

function withGrouping(locales, options) {
  if (!isItalian(locales)) return options;
  if (options && options.useGrouping !== undefined) return options;
  return { ...(options || {}), useGrouping: "always" };
}

let installed = false;

export function installItalianGrouping() {
  if (installed || typeof Intl === "undefined") return;
  installed = true;

  const Native = Intl.NumberFormat;
  function NumberFormat(locales, options) {
    return new Native(locales, withGrouping(locales, options));
  }
  NumberFormat.prototype = Native.prototype;
  NumberFormat.supportedLocalesOf = Native.supportedLocalesOf.bind(Native);
  Intl.NumberFormat = NumberFormat;

  const nativeToLocale = Number.prototype.toLocaleString;
  // eslint-disable-next-line no-extend-native
  Number.prototype.toLocaleString = function toLocaleString(locales, options) {
    return nativeToLocale.call(this, locales, withGrouping(locales, options));
  };
}

installItalianGrouping();
