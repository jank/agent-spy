import { describe, it, expect } from 'vitest';

// Test the isNewer function by extracting its logic
// (it's private in the module, so we replicate it here for unit testing)
function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

describe('isNewer (semver comparison)', () => {
  it('returns true for newer major version', () => {
    expect(isNewer('2.0.0', '1.0.0')).toBe(true);
  });

  it('returns true for newer minor version', () => {
    expect(isNewer('1.1.0', '1.0.0')).toBe(true);
  });

  it('returns true for newer patch version', () => {
    expect(isNewer('1.0.4', '1.0.3')).toBe(true);
  });

  it('returns false for same version', () => {
    expect(isNewer('1.0.3', '1.0.3')).toBe(false);
  });

  it('returns false for older version', () => {
    expect(isNewer('1.0.2', '1.0.3')).toBe(false);
  });

  it('returns false for older major version', () => {
    expect(isNewer('0.9.9', '1.0.0')).toBe(false);
  });

  it('handles missing patch segment', () => {
    expect(isNewer('1.1', '1.0.0')).toBe(true);
  });

  it('handles single segment versions', () => {
    expect(isNewer('2', '1')).toBe(true);
    expect(isNewer('1', '2')).toBe(false);
  });
});
