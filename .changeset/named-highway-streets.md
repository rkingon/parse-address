---
'@rkingon/parse-address': patch
---

Preserve named-highway street designations on street-only input. `W11001
County Road X` (line1 without city/state) previously informal-parsed to
`street: "County", type: "Rd"`, silently dropping the `X` — likewise the `27`
in `State Road 27`, the `51` in `US Highway 51`, and the `A` in `County Route
A`. County/State/US + Road/Highway/Route + a short designation now parses as
a single street name with no type, including a trailing directional
(`County Road X N` → `suffix: "N"`). Letter designations must not be a state
code or a directional and must end the segment, so `123 County Rd Ada OK`,
`123 County Rd WI`, and `123 County Rd W, Madison, WI` all parse exactly as
before.
