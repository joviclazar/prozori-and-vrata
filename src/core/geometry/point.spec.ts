import { describe, expect, it } from 'vitest';
import { distance } from './point';

describe('distance', () => {
  it('is zero for the same point', () => {
    expect(distance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
  });

  it('computes the Euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('works with negative coordinates', () => {
    expect(distance({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5);
  });

  it('is symmetric', () => {
    const a = { x: -2, y: 7 };
    const b = { x: 5, y: -1 };
    expect(distance(a, b)).toBe(distance(b, a));
  });

  it('ignores extra properties such as time', () => {
    // Structural typing: anything with x and y is a Point, so stroke points can be passed directly.
    const a = { x: 0, y: 0, t: 0 };
    const b = { x: 0, y: 10, t: 999 };
    expect(distance(a, b)).toBe(10);
  });
});
