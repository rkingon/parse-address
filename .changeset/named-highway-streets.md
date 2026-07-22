---
'@rkingon/parse-address': patch
---

Preserve named-highway street designations on street-only input. `W11001
County Road X` (line1 without city/state) previously informal-parsed to
`street: "County", type: "Rd"`, silently dropping the `X` — likewise the `27`
in `State Road 27` and the `51` in `US Highway 51`. County/State/US +
Road/Highway + a short designation now parses as a single street name with no
type, matching what full addresses already produced. Letter designations must
end the segment and must not be a state code, so `123 County Rd Ada OK` and
`123 County Rd WI` parse exactly as before.
