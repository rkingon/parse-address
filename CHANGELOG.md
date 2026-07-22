# @rkingon/parse-address

## 1.0.0

### Major Changes

- [#1](https://github.com/rkingon/parse-address/pull/1) [`2151e57`](https://github.com/rkingon/parse-address/commit/2151e5702edf2867f53c68e242479b2b3a4b742d) Thanks [@rkingon](https://github.com/rkingon)! - 1.0.0 — first feature release.

  Parse directional house numbers (`W11001`, `N5678`, spaced `W 11001`) — the
  rural-Wisconsin style locally known as fire numbers. The directional letter is
  kept as part of `number`, and the spaced form is normalized to the fused
  `W11001`. Guarded so numbered street names (`N 95th St`) and grid-style streets
  (`123 N 400 E`) parse exactly as before; the full historical conformance suite
  is unchanged.

## 0.0.2

### Patch Changes

- [`a570757`](https://github.com/rkingon/parse-address/commit/a5707570004d4760abc35880864198e3dd301027) Thanks [@rkingon](https://github.com/rkingon)! - Add package author, `homepage`, and `bugs` metadata.

## 0.0.1

### Patch Changes

- Initial release. A modern TypeScript rebuild of `parse-address`
  (Geo::StreetAddress::US) with dual ESM/CJS output, a typed `ParsedAddress`
  result, and all five parsers exported: `parseLocation`, `parseAddress`,
  `parseInformalAddress`, `parsePoAddress`, and `parseIntersection`. Parsing
  behavior matches the original — verified against its full conformance suite.
