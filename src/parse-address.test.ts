import { describe, expect, it } from 'vitest';
import { parseLocation } from './index';
import fixtures from './fixtures.json';

// Conformance corpus carried over from the classic parse-address test suite.
// Phase 1 is a behavior-preserving rebuild, so every historical input must
// still parse to exactly the same components.
const cases = fixtures as Record<string, Record<string, string>>;

describe('parseLocation conformance', () => {
  for (const [input, expected] of Object.entries(cases)) {
    it(input, () => {
      expect(parseLocation(input)).toEqual(expected);
    });
  }
});
