import { describe, expect, it } from 'vitest';
import { Point } from './point';
import { simplifyPath } from './simplify-path';

function polyline(corners: readonly Point[], stepsPerSide = 10): Point[] {
  const points: Point[] = [corners[0]];
  for (let c = 1; c < corners.length; c++) {
    const from = corners[c - 1];
    const to = corners[c];
    for (let s = 1; s <= stepsPerSide; s++) {
      points.push({
        x: from.x + ((to.x - from.x) * s) / stepsPerSide,
        y: from.y + ((to.y - from.y) * s) / stepsPerSide,
      });
    }
  }
  return points;
}

describe('simplifyPath', () => {
  it('returns an empty path unchanged', () => {
    expect(simplifyPath([], 2)).toEqual([]);
  });

  it('returns a single point unchanged', () => {
    expect(simplifyPath([{ x: 1, y: 2 }], 2)).toEqual([{ x: 1, y: 2 }]);
  });

  it('keeps both points of a two-point path', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
    ];
    expect(simplifyPath(points, 2)).toEqual(points);
  });

  it('reduces a straight line with many points to its endpoints', () => {
    const points = polyline([
      { x: 0, y: 0 },
      { x: 100, y: 50 },
    ]);
    expect(simplifyPath(points, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 50 },
    ]);
  });

  it('removes hand jitter smaller than the tolerance', () => {
    const points: Point[] = [];
    for (let x = 0; x <= 100; x += 5) {
      points.push({ x, y: (x / 5) % 2 === 1 ? 1 : 0 });
    }
    expect(simplifyPath(points, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('keeps a point that deviates more than the tolerance', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 5 },
      { x: 100, y: 0 },
    ];
    expect(simplifyPath(points, 2)).toEqual(points);
  });

  it('removes a point that deviates exactly by the tolerance', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 2 },
      { x: 100, y: 0 },
    ];
    expect(simplifyPath(points, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('keeps the corner of an L shape', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 80, y: 100 },
    ];
    expect(simplifyPath(polyline(corners), 2)).toEqual(corners);
  });

  it('reduces a U-shaped frame stroke to its four corners', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    ];
    expect(simplifyPath(polyline(corners), 2)).toEqual(corners);
  });

  it('handles a closed frame drawn in one stroke that ends where it started', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 },
    ];
    expect(simplifyPath(polyline(corners), 2)).toEqual(corners);
  });

  it('returns the original point objects, so stroke points keep their time', () => {
    const points = [
      { x: 0, y: 0, time: 0 },
      { x: 50, y: 0.5, time: 10 },
      { x: 100, y: 0, time: 20 },
    ];
    const result = simplifyPath(points, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(points[0]);
    expect(result[1]).toBe(points[2]);
    expect(result[1].time).toBe(20);
  });

  it('returns a subset of the input in the original order, including both ends', () => {
    const circle: Point[] = [];
    for (let degrees = 0; degrees < 360; degrees += 2) {
      const angle = (degrees * Math.PI) / 180;
      circle.push({ x: 100 * Math.cos(angle), y: 100 * Math.sin(angle) });
    }

    const result = simplifyPath(circle, 1);
    const indices = result.map((p) => circle.indexOf(p));

    expect(result.length).toBeGreaterThan(2);
    expect(result.length).toBeLessThan(circle.length);
    expect(indices).not.toContain(-1);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(circle.length - 1);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it('throws for a negative tolerance', () => {
    expect(() => simplifyPath([{ x: 0, y: 0 }], -1)).toThrow();
  });
});
