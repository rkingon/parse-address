---
'@rkingon/parse-address': major
---

1.0.0 — first feature release.

Parse directional house numbers (`W11001`, `N5678`, spaced `W 11001`) — the
rural-Wisconsin style locally known as fire numbers. The directional letter is
kept as part of `number`, and the spaced form is normalized to the fused
`W11001`. Guarded so numbered street names (`N 95th St`) and grid-style streets
(`123 N 400 E`) parse exactly as before; the full historical conformance suite
is unchanged.
