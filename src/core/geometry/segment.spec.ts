import { describe, expect, it } from 'vitest';
import { distanceToSegment } from './segment';

const a = { x: 0, y: 0 };
const b = { x: 10, y: 0 };

describe('distanceToSegment', () => {
  it('is zero for a point on the segment', () => {
    expect(distanceToSegment({ x: 4, y: 0 }, a, b)).toBe(0);
  });

  it('is zero for an endpoint', () => {
    expect(distanceToSegment(b, a, b)).toBe(0);
  });

  it('is the perpendicular distance for a point beside the segment', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, a, b)).toBe(3);
    expect(distanceToSegment({ x: 5, y: -3 }, a, b)).toBe(3);
  });

  it('is the distance to the nearer endpoint for a point beyond the end', () => {
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBe(5);
  });

  it('is the distance to the nearer endpoint for a point before the start', () => {
    expect(distanceToSegment({ x: -3, y: -4 }, a, b)).toBe(5);
  });

  it('works for a diagonal segment', () => {
    expect(distanceToSegment({ x: 0, y: 10 }, a, { x: 10, y: 10 })).toBeCloseTo(10 / Math.SQRT2);
  });

  it('does not depend on the direction of the segment', () => {
    const p = { x: 7, y: 2 };
    expect(distanceToSegment(p, a, b)).toBe(distanceToSegment(p, b, a));
  });

  it('treats a zero-length segment as a point', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBe(5);
  });
});
