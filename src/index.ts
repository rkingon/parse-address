/**
 * @rkingon/parse-address
 *
 * A US street-address parser. A modern TypeScript rebuild of the classic
 * `parse-address` package, itself a port of Perl's `Geo::StreetAddress::US`.
 * Forgiving, regex-driven parsing of free-form address strings into their
 * component parts.
 */
import XRegExp from 'xregexp';
import { DIRECTIONALS, STREET_TYPES, STATE_CODES } from './tables';
import { DIRECTION_CODE, getGrammar } from './grammar';

/**
 * The parsed components of an address. Every field is optional — only the
 * pieces actually present in the input are populated. Standard addresses use
 * the un-suffixed fields; intersections use the `*1` / `*2` pairs for their two
 * cross streets.
 */
export interface ParsedAddress {
  /** House / building number, e.g. `1005` or grid `N95W18855`. */
  number?: string;
  /** Leading directional, e.g. `N`. */
  prefix?: string;
  /** Street name, e.g. `Gravenstein`. */
  street?: string;
  /** Street type, normalized + title-cased, e.g. `Hwy`. */
  type?: string;
  /** Trailing directional, e.g. `N`. */
  suffix?: string;
  /** Secondary unit designator, e.g. `Suite`, `Apt`, `PO box`. */
  sec_unit_type?: string;
  /** Secondary unit value, e.g. `500`. */
  sec_unit_num?: string;
  /** City / place name. */
  city?: string;
  /** Two-letter USPS state code. */
  state?: string;
  /** Five-digit ZIP. */
  zip?: string;
  /** ZIP+4 add-on. */
  plus4?: string;

  /** Intersection: first street's directional prefix. */
  prefix1?: string;
  /** Intersection: first street name. */
  street1?: string;
  /** Intersection: first street type. */
  type1?: string;
  /** Intersection: first street's directional suffix. */
  suffix1?: string;
  /** Intersection: second street's directional prefix. */
  prefix2?: string;
  /** Intersection: second street name. */
  street2?: string;
  /** Intersection: second street type. */
  type2?: string;
  /** Intersection: second street's directional suffix. */
  suffix2?: string;
}

/** Fields whose values get canonicalized against a reference table. */
const NORMALIZE_MAP: Record<string, Record<string, string>> = {
  prefix: DIRECTIONALS,
  prefix1: DIRECTIONALS,
  prefix2: DIRECTIONALS,
  suffix: DIRECTIONALS,
  suffix1: DIRECTIONALS,
  suffix2: DIRECTIONALS,
  type: STREET_TYPES,
  type1: STREET_TYPES,
  type2: STREET_TYPES,
  state: STATE_CODES,
};

const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Run a compiled pattern and flatten its named captures into a plain object. */
function execGroups(regex: RegExp, input: string): Record<string, string | undefined> | null {
  const match = XRegExp.exec(input, regex);
  if (!match) return null;
  // XRegExp v5 exposes named captures under `.groups` (native semantics).
  return { ...(match.groups as Record<string, string> | undefined) };
}

/**
 * Turn a raw match's captures into a clean `ParsedAddress`: collapse the
 * numbered group-name suffixes back to field names, strip stray punctuation,
 * canonicalize directions / types / states, and expand a leading directional
 * on the city.
 */
function normalize(parts: Record<string, string | undefined> | null): ParsedAddress | null {
  if (!parts) return null;

  const result: Record<string, string> = {};
  for (const rawKey of Object.keys(parts)) {
    // Group names carry a numeric suffix to keep them unique across the
    // grammar (`type_2`, `street1_0`, `sec_unit_num_1`, …). Drop that suffix
    // to recover the public field name.
    const segments = rawKey.split('_');
    const last = segments[segments.length - 1];
    const key = Number.isFinite(Number(last)) ? segments.slice(0, -1).join('_') : rawKey;

    const value = parts[rawKey];
    if (value) {
      result[key] = value.trim().replace(/^\s+|\s+$|[^\w\s\-#&]/g, '');
    }
  }

  for (const [key, table] of Object.entries(NORMALIZE_MAP)) {
    const value = result[key];
    if (value && table[value.toLowerCase()]) {
      result[key] = table[value.toLowerCase()];
    }
  }

  for (const key of ['type', 'type1', 'type2']) {
    if (key in result) {
      result[key] = result[key].charAt(0).toUpperCase() + result[key].slice(1).toLowerCase();
    }
  }

  if (result.city) {
    const { dircode } = getGrammar();
    const leadingDir = XRegExp(`^(?<dircode>${dircode})\\s+(?=\\S)`, 'ix');
    result.city = XRegExp.replace(result.city, leadingDir, (...args: unknown[]) => {
      const groups = args[args.length - 1] as Record<string, string>;
      return `${capitalize(DIRECTION_CODE[groups.dircode.toUpperCase()])} `;
    });
  }

  return result as ParsedAddress;
}

/**
 * Parse a complete, well-formed address (must include a house number and
 * street). Returns `null` if the input doesn't match.
 */
export function parseAddress(input: string): ParsedAddress | null {
  return normalize(execGroups(getGrammar().address, input));
}

/**
 * Parse an informal / partial address — more forgiving than {@link parseAddress}
 * (the house number and other pieces may be missing).
 */
export function parseInformalAddress(input: string): ParsedAddress | null {
  return normalize(execGroups(getGrammar().informal, input));
}

/** Parse a PO-box-style address (a unit designator plus place, no street). */
export function parsePoAddress(input: string): ParsedAddress | null {
  return normalize(execGroups(getGrammar().poAddress, input));
}

/** Parse a street intersection, e.g. `Mission & Valencia, San Francisco CA`. */
export function parseIntersection(input: string): ParsedAddress | null {
  const grammar = getGrammar();
  const parts = normalize(execGroups(grammar.intersection, input));
  if (!parts) return parts;

  parts.type2 = parts.type2 || '';
  parts.type1 = parts.type1 || '';

  // When only one street carries a (plural) type — "Mission & Valencia Sts" —
  // fold the shared, singularized type onto both streets.
  if ((parts.type2 && !parts.type1) || parts.type1 === parts.type2) {
    let type = parts.type2;
    type = XRegExp.replace(type, /s\W*$/, '');
    if (XRegExp(`^${grammar.type}$`, 'ix').test(type)) {
      parts.type1 = parts.type2 = type;
    }
  }

  return parts;
}

/**
 * The general entry point. Detects the kind of input — intersection, PO box, or
 * a street address — and dispatches to the right parser, falling back from a
 * strict to an informal parse for plain addresses.
 */
export function parseLocation(input: string): ParsedAddress | null {
  const grammar = getGrammar();
  if (XRegExp(grammar.corner, 'xi').test(input)) return parseIntersection(input);
  if (XRegExp(`^${grammar.poBox}`, 'xi').test(input)) return parsePoAddress(input);
  return parseAddress(input) || parseInformalAddress(input);
}
