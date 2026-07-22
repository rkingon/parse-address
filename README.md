# @rkingon/parse-address

A forgiving US street-address parser. Turns free-form address strings into
structured components — number, street, unit, city, state, ZIP — with support
for directionals, secondary units, PO boxes, grid-style numbers, intersections,
and the full set of USPS street-type and state abbreviations.

A modern, dependency-light TypeScript rebuild of the classic
[`parse-address`](https://github.com/hassansin/parse-address), itself a port of
Perl's [`Geo::StreetAddress::US`](https://metacpan.org/pod/Geo::StreetAddress::US).

## Installation

```bash
npm install @rkingon/parse-address
# or
pnpm add @rkingon/parse-address
# or
yarn add @rkingon/parse-address
```

## Quick Start

```typescript
import { parseLocation } from '@rkingon/parse-address';

parseLocation('1005 N Gravenstein Highway Sebastopol CA 95472');
// {
//   number: '1005',
//   prefix: 'N',
//   street: 'Gravenstein',
//   type:   'Hwy',
//   city:   'Sebastopol',
//   state:  'CA',
//   zip:    '95472',
// }
```

Every result is a `ParsedAddress`; unmatched inputs return `null`.

## Features

- **Typed results** — a fully typed `ParsedAddress`, every field optional.
- **One entry point** — `parseLocation` auto-detects addresses, PO boxes, and
  intersections and dispatches accordingly.
- **Normalized output** — street types, directionals, and state names collapse
  to their canonical USPS forms (`Highway` → `Hwy`, `North` → `N`, `California`
  → `CA`).
- **Handles the awkward cases** — secondary units (`Suite 500`, `Apt 2`, `#3`),
  ZIP+4, grid numbers (`N95W18855`), directional house numbers (`W11001`,
  `W 11001`), fractional addresses, and intersections.
- **Dual ESM / CJS** with types for both.

## Usage

### The general parser

`parseLocation` is the entry point for most uses. It figures out what kind of
input it's looking at:

```typescript
import { parseLocation } from '@rkingon/parse-address';

parseLocation('1005 N Gravenstein Hwy Suite 500 Sebastopol, CA');
// { number, prefix, street, type, sec_unit_type: 'Suite', sec_unit_num: '500', city, state }

parseLocation('P.O. box 3094 Collierville TN 38027');
// { sec_unit_type: 'PO box', sec_unit_num: '3094', city, state, zip }

parseLocation('Mission St and Valencia St San Francisco CA');
// { street1: 'Mission', type1: 'St', street2: 'Valencia', type2: 'St', city, state }
```

### The specific parsers

Reach for these when you already know the shape of the input:

```typescript
import {
  parseAddress,          // strict: requires a house number + street
  parseInformalAddress,  // forgiving: pieces may be missing
  parsePoAddress,        // PO-box-style (unit + place, no street)
  parseIntersection,     // two cross streets
} from '@rkingon/parse-address';

parseAddress('7800 Mill Station Rd, Sebastopol, CA 95472');
parseInformalAddress('Apt 2, 1600 Pennsylvania Ave');
```

## API

| Function | Description |
|----------|-------------|
| `parseLocation(input)` | Auto-detects the input type and dispatches. The general-purpose entry point. |
| `parseAddress(input)` | Strict full address (house number + street required). |
| `parseInformalAddress(input)` | Forgiving parse; components may be absent. |
| `parsePoAddress(input)` | PO-box-style input (secondary unit + place). |
| `parseIntersection(input)` | Two streets joined by a corner token (`and`, `&`, `at`). |

All return `ParsedAddress | null`.

### `ParsedAddress`

```typescript
interface ParsedAddress {
  number?: string;         // house / building number
  prefix?: string;         // leading directional (N, SW, …)
  street?: string;
  type?: string;           // normalized + title-cased street type (Hwy, Ave, …)
  suffix?: string;         // trailing directional
  sec_unit_type?: string;  // Suite, Apt, PO box, …
  sec_unit_num?: string;
  city?: string;
  state?: string;          // two-letter USPS code
  zip?: string;
  plus4?: string;

  // intersections
  prefix1?: string; street1?: string; type1?: string; suffix1?: string;
  prefix2?: string; street2?: string; type2?: string; suffix2?: string;
}
```

## Credits & lineage

This is a from-scratch TypeScript implementation that preserves the parsing
behavior of the original
[`parse-address`](https://github.com/hassansin/parse-address) by
[**hassansin**](https://github.com/hassansin) (ISC licensed) and, through it,
Perl's [`Geo::StreetAddress::US`](https://metacpan.org/pod/Geo::StreetAddress::US)
by Schuyler D. Erle & Tim Bunce. The USPS abbreviation tables and address
grammar are reproduced from that work for functional parity. All credit for the
original parsing approach belongs to those authors.

## Contributing

This project uses [Changesets](https://github.com/changesets/changesets) for
versioning and publishing.

```bash
pnpm install
pnpm test        # run the conformance suite
pnpm typecheck   # type-check
pnpm build       # emit dist/
```

To land a change:

1. Branch and make your change.
2. Add a changeset: `pnpm changeset` (pick `patch` / `minor` / `major`).
3. Commit the changeset with your change and open a PR.

Merging to `main` opens a "Version Packages" PR; merging that publishes to npm.

## License

MIT
