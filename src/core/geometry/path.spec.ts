import { describe, expect, it } from 'vitest';
import { pathLength, straightness } from './path';

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
  { x: 0, y: 0 },
];

describe('pathLength', () => {
  it('is zero for an empty path', () => {
    expect(pathLength([])).toBe(0);
  });

  it('is zero for a single point', () => {
    expect(pathLength([{ x: 4, y: 4 }])).toBe(0);
  });

  it('equals the distance for two points', () => {
    expect(
      pathLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toBe(5);
  });

  it('sums all segments of a polyline', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 10 },
    ];
    expect(pathLength(points)).toBe(11);
  });

  it('measures a closed path all the way around', () => {
    expect(pathLength(square)).toBe(40);
  });
});

describe('straightness', () => {
  it('is 1 for a perfectly straight path with many points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 5, y: 10 },
    ];
    expect(straightness(points)).toBeCloseTo(1);
  });

  it('is about 0.707 for an L shape with equal legs', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    // chord = sqrt(200) ~ 14.14, path = 20
    expect(straightness(points)).toBeCloseTo(Math.SQRT2 / 2);
  });

  it('is 0 for a closed path that returns to its start', () => {
    expect(straightness(square)).toBe(0);
  });

  it('is 0 for an empty path', () => {
    expect(straightness([])).toBe(0);
  });

  it('is 0 for a single point (a dot is not a line)', () => {
    expect(straightness([{ x: 1, y: 1 }])).toBe(0);
  });

  it('is 0 for repeated identical points (zero length path)', () => {
    expect(
      straightness([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ]),
    ).toBe(0);
  });

  it('stays between 0 and 1 for a zig-zag', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
      { x: 15, y: 5 },
    ];
    const s = straightness(points);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});
