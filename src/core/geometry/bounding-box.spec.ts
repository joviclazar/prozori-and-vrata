import { describe, expect, it } from 'vitest';
import { boundingBox } from './bounding-box';

describe('boundingBox', () => {
  it('returns a zero-size box for a single point', () => {
    expect(boundingBox([{ x: 2, y: 3 }])).toEqual({ minX: 2, minY: 3, maxX: 2, maxY: 3 });
  });

  it('encloses all points regardless of their order', () => {
    const points = [
      { x: 5, y: 1 },
      { x: -2, y: 4 },
      { x: 3, y: -6 },
    ];
    expect(boundingBox(points)).toEqual({ minX: -2, minY: -6, maxX: 5, maxY: 4 });
  });

  it('handles a horizontal line (zero height)', () => {
    const points = [
      { x: 0, y: 7 },
      { x: 10, y: 7 },
    ];
    expect(boundingBox(points)).toEqual({ minX: 0, minY: 7, maxX: 10, maxY: 7 });
  });

  it('throws for an empty point list', () => {
    expect(() => boundingBox([])).toThrow();
  });
});
