import XRegExp from 'xregexp';
import { DIRECTIONALS, STREET_TYPES, STATE_CODES } from './tables';

const keysOf = (o: Record<string, string>): string[] => Object.keys(o);
const valuesOf = (o: Record<string, string>): string[] => Object.values(o);

function invert(o: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keysOf(o)) out[o[k]] = k;
  return out;
}

/** USPS code → full compass word (e.g. `N` → `north`). Inverse of DIRECTIONALS. */
export const DIRECTION_CODE = invert(DIRECTIONALS);

/**
 * The four compiled matchers plus the handful of raw tokens the parser and
 * normalizer still need at runtime (for dispatch tests and re-validation).
 */
export interface Grammar {
  address: RegExp;
  informal: RegExp;
  poAddress: RegExp;
  intersection: RegExp;
  corner: string;
  poBox: string;
  type: string;
  dircode: string;
}

let cached: Grammar | undefined;

/**
 * Build (once, memoized) the address grammar. Compiling the composite patterns
 * isn't free, so we defer it to first use and cache the result.
 */
export function getGrammar(): Grammar {
  if (cached) return cached;

  const escape = XRegExp.escape;

  // Directional alternation: full words first, then each abbreviation in a
  // dotted ("N\.") and bare ("N") form.
  //
  // The comparator is intentionally the original grammar's — it returns a
  // boolean (coerced to 1/0, never negative), so it is NOT a real length sort.
  // Preserving it keeps the emitted alternation order, and thus matching,
  // identical to the reference implementation.
  const direct = valuesOf(DIRECTIONALS)
    .sort((a, b) => (a.length < b.length ? 1 : 0))
    .reduce<string[]>(
      (acc, code) => acc.concat([escape(code.replace(/\w/g, '$&.')), code]),
      keysOf(DIRECTIONALS),
    )
    .join('|');

  // Every street-type token (aliases + canonical forms), de-duplicated, sorted.
  const type = [...keysOf(STREET_TYPES), ...valuesOf(STREET_TYPES)]
    .sort()
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join('|');

  const state = `\\b(?:${[...keysOf(STATE_CODES), ...valuesOf(STATE_CODES)]
    .map(escape)
    .join('|')})\\b`;
  const dircode = keysOf(DIRECTION_CODE).join('|');

  const fraction = `\\d+\\/\\d+`;
  const zip = `(?<zip>\\d{5})[- ]?(?<plus4>\\d{4})?`;
  const corner = `(?:\\band\\b|\\bat\\b|&|\\@)`;
  // Wisconsin rural "fire numbers": a single directional letter fused to the
  // house number ("W11001", "N5678"), optionally written with a space
  // ("W 11001"). Deliberately narrow — anything this doesn't match falls back
  // to the previous parse, never a new rejection. Both forms require 4+
  // digits: shorter runs collide with directional street names ("S12 Main
  // St", "N400 Main St", Utah's "123 N 400 E") and typo'd house numbers. The
  // digits must not run into letters ("N95th" is a street, not a number), and
  // the spaced form must not be followed by a directional (grid streets).
  const fireNumber = `
    [NSEW]\\d{4,6}(?![a-z])
    |
    [NSEW]\\s\\d{4,6}(?!\\w)(?!\\s+(?:${direct})(?!\\w))`;
  // Plain house numbers ("123", "123-5"), grid numbers ("N95W18855"), or fire
  // numbers ("W11001"). Grid must precede fire so "N95W18855" isn't split.
  const number = `(?<number>(\\d+-?\\d*)|([N|S|E|W]\\d{1,3}[N|S|E|W]\\d{1,6})|(${fireNumber}))(?=\\D)`;

  // Named county/state/US highways: the road-class words plus a short
  // designation are the street name itself — "County Road X", "State Road 27",
  // "US Highway 51" — with no separate street type. Without this branch the
  // informal parse (not end-anchored) matches "County" + type "Rd" and
  // silently drops the designation. Letter designations (Wisconsin county
  // trunks: X, KK) must end the segment and must not be a state code, so
  // "123 County Rd Ada OK" and "123 County Rd WI" parse exactly as before.
  const namedHighway = `
    (?:county|state|u\\.?s\\.?)
    [^\\w,]+
    (?:road|rd|highway|hwy|route|rte)
    [^\\w,]+
    (?:
      \\d{1,4}\\b
      |
      (?!(?:${state}))[a-z]{1,3}(?=\\s*(?:$|,))
    )`;

  const street = `
    (?:
      (?:(?<street_0>${direct})\\W+
         (?<type_0>${type})\\b
      )
      |
      (?:(?<prefix_0>${direct})\\W+)?
      (?:
        (?<street_4>${namedHighway})
        (?:[^\\w,]+(?<suffix_4>${direct})\\b)?
        |
        (?<street_1>[^,]*\\d)
        (?:[^\\w,]*(?<suffix_1>${direct})\\b)
        |
        (?<street_2>[^,]+)
        (?:[^\\w,]+(?<type_2>${type})\\b)
        (?:[^\\w,]+(?<suffix_2>${direct})\\b)?
        |
        (?<street_3>[^,]+?)
        (?:[^\\w,]+(?<type_3>${type})\\b)?
        (?:[^\\w,]+(?<suffix_3>${direct})\\b)?
      )
    )`;

  const poBox = `p\\W*(?:[om]|ost\\ ?office)\\W*b(?:ox)?`;

  const secUnitNumbered = `
    (?<sec_unit_type_1>su?i?te
      |${poBox}
      |(?:ap|dep)(?:ar)?t(?:me?nt)?
      |ro*m
      |flo*r?
      |uni?t
      |bu?i?ldi?n?g
      |ha?nga?r
      |lo?t
      |pier
      |slip
      |spa?ce?
      |stop
      |tra?i?le?r
      |box)(?![a-z]
    )`;

  const secUnitUnnumbered = `
    (?<sec_unit_type_2>ba?se?me?n?t
      |fro?nt
      |lo?bby
      |lowe?r
      |off?i?ce?
      |pe?n?t?ho?u?s?e?
      |rear
      |side
      |uppe?r
    )\\b`;

  const secUnit = `
    (?:                               #fix3
      (?:                             #fix1
        (?:
          (?:${secUnitNumbered}\\W*)
          |(?<sec_unit_type_3>\\#)\\W*
        )
        (?<sec_unit_num_1>[\\w-]+)
      )
      |
      ${secUnitUnnumbered}
    )`;

  const cityState = `
    (?:
      (?<city>[^\\d,]+?)\\W+
      (?<state>${state})
    )`;

  const place = `
    (?:${cityState}\\W*)?
    (?:${zip})?`;

  const sep = `(?:\\W+|$)`;
  // A second copy of the unit pattern with distinct group names (append `1` to
  // each numeric group suffix), so it can coexist with the first copy in a
  // single pattern without duplicate capture-group names.
  const secUnitAlt = secUnit.replace(/_\d/g, '$&1');

  const address = XRegExp(
    `
    ^
    [^\\w\\#]*
    (${number})\\W*
    (?:${fraction}\\W*)?
       ${street}\\W+
    (?:${secUnit})?\\W*          #fix2
       ${place}
    \\W*$`,
    'ix',
  );

  const informal = XRegExp(
    `
    ^
    \\s*
    (?:${secUnit}${sep})?
    (?:${number})?\\W*
    (?:${fraction}\\W*)?
       ${street}${sep}
    (?:${secUnitAlt}${sep})?
    (?:${place})?`,
    'ix',
  );

  const poAddress = XRegExp(
    `
    ^
    \\s*
    (?:${secUnitAlt}${sep})?
    (?:${place})?`,
    'ix',
  );

  // Two streets joined by a corner token; each street copy gets a `1`/`2`
  // prefix on its group-name suffixes to keep them distinct.
  const intersection = XRegExp(
    `
    ^\\W*
    ${street.replace(/_\d/g, '1$&')}\\W*?
    \\s+${corner}\\s+
    ${street.replace(/_\d/g, '2$&')}($|\\W+)
    ${place}\\W*$`,
    'ix',
  );

  cached = { address, informal, poAddress, intersection, corner, poBox, type, dircode };
  return cached;
}
