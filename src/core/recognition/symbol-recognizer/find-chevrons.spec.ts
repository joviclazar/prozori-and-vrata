import { describe, expect, it } from 'vitest';
import { Point } from '../../geometry/point';
import { toSegments } from '../../geometry/segment';
import { Stroke } from '../../model/stroke';
import { SegmentedStroke } from '../segmentation/segment-strokes';
import { apexDirection, findChevrons } from './find-chevrons';
import { SymbolThresholds } from './symbol-config';

const THRESHOLDS: SymbolThresholds = {
  maxCornerDeg: 110,
  minArmRatio: 0.5,
  maxJoinGapRatio: 0.25,
};

function segmented(id: number, vertices: readonly Point[]): SegmentedStroke {
  const stroke: Stroke = {
    id,
    pointerType: 'mouse',
    points: vertices.map((p, i) => ({ x: p.x, y: p.y, time: i * 10 })),
  };
  return { stroke, segments: toSegments(stroke.points) };
}

function towards(from: Point, deg: number, length: number): Point {
  const rad = (deg * Math.PI) / 180;
  return { x: from.x + length * Math.cos(rad), y: from.y - length * Math.sin(rad) };
}

function chevronWithAngle(id: number, apex: Point, cornerDeg: number, armA = 100, armB = 100) {
  const half = cornerDeg / 2;
  return segmented(id, [towards(apex, 180 + half, armA), apex, towards(apex, 180 - half, armB)]);
}

describe('apexDirection', () => {
  it('points right for ">"', () => {
    expect(apexDirection({ x: 100, y: 0 }, { x: 0, y: -50 }, { x: 0, y: 50 })).toBe('right');
  });

  it('points left for "<"', () => {
    expect(apexDirection({ x: 0, y: 0 }, { x: 100, y: -50 }, { x: 100, y: 50 })).toBe('left');
  });

  it('points up for "Λ", remembering that y grows downwards on the canvas', () => {
    expect(apexDirection({ x: 0, y: -100 }, { x: -50, y: 0 }, { x: 50, y: 0 })).toBe('up');
  });

  it('points down for "V"', () => {
    expect(apexDirection({ x: 0, y: 100 }, { x: -50, y: 0 }, { x: 50, y: 0 })).toBe('down');
  });

  it('does not depend on the order of the two ends', () => {
    const apex = { x: 100, y: 0 };
    const a = { x: 0, y: -50 };
    const b = { x: 0, y: 50 };
    expect(apexDirection(apex, b, a)).toBe(apexDirection(apex, a, b));
  });

  it('splits the directions at 45 degrees', () => {
    const ends = [
      { x: -10, y: 0 },
      { x: 10, y: 0 },
    ] as const;
    expect(apexDirection({ x: 100, y: -90 }, ...ends)).toBe('right');
    expect(apexDirection({ x: 100, y: -110 }, ...ends)).toBe('up');
    expect(apexDirection({ x: -100, y: -90 }, ...ends)).toBe('left');
    expect(apexDirection({ x: -100, y: 110 }, ...ends)).toBe('down');
  });
});

describe('findChevrons', () => {
  it('finds nothing for no strokes', () => {
    expect(findChevrons([], THRESHOLDS)).toEqual([]);
  });

  it('finds a flat ">" drawn with one stroke, with its apex', () => {
    const stroke = segmented(1, [
      { x: 150, y: 200 },
      { x: 250, y: 240 },
      { x: 150, y: 280 },
    ]);

    expect(findChevrons([stroke], THRESHOLDS)).toMatchObject([
      { direction: 'right', apex: { x: 250, y: 240 } },
    ]);
  });

  it('finds a "<" and a narrow "Λ"', () => {
    const turn = segmented(1, [
      { x: 350, y: 200 },
      { x: 250, y: 240 },
      { x: 350, y: 280 },
    ]);
    const tilt = segmented(2, [
      { x: 200, y: 380 },
      { x: 240, y: 200 },
      { x: 280, y: 380 },
    ]);

    expect(findChevrons([turn, tilt], THRESHOLDS).map((c) => c.direction)).toEqual(['left', 'up']);
  });

  it('accepts a wide ">" of 85 degrees, as in a recorded sketch, and rejects a corner over the limit', () => {
    const apex = { x: 300, y: 200 };

    expect(findChevrons([chevronWithAngle(1, apex, 85)], THRESHOLDS)).toHaveLength(1);
    expect(findChevrons([chevronWithAngle(1, apex, 109)], THRESHOLDS)).toHaveLength(1);
    expect(findChevrons([chevronWithAngle(1, apex, 111)], THRESHOLDS)).toEqual([]);
  });

  it('needs arms of comparable length', () => {
    const apex = { x: 300, y: 200 };

    expect(findChevrons([chevronWithAngle(1, apex, 40, 100, 52)], THRESHOLDS)).toHaveLength(1);
    expect(findChevrons([chevronWithAngle(1, apex, 40, 100, 48)], THRESHOLDS)).toEqual([]);
  });

  it('ignores a straight stroke', () => {
    const line = segmented(1, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]);

    expect(findChevrons([line], THRESHOLDS)).toEqual([]);
  });

  it('joins two single strokes that meet at one point into a ">", as in a recorded sketch', () => {
    const upper = segmented(8, [
      { x: 424, y: 207 },
      { x: 492, y: 264 },
    ]);
    const lower = segmented(9, [
      { x: 492, y: 264 },
      { x: 428, y: 314 },
    ]);

    expect(findChevrons([upper, lower], THRESHOLDS)).toMatchObject([
      { direction: 'right', apex: { x: 492, y: 264 } },
    ]);
  });

  it('joins two single strokes in any drawing direction, with the apex between the nearest ends', () => {
    const upper = segmented(8, [
      { x: 492, y: 264 },
      { x: 424, y: 207 },
    ]);
    const lower = segmented(9, [
      { x: 428, y: 314 },
      { x: 496, y: 268 },
    ]);

    expect(findChevrons([upper, lower], THRESHOLDS)).toMatchObject([
      { direction: 'right', apex: { x: 494, y: 266 } },
    ]);
  });

  it('does not join single strokes whose ends are too far apart', () => {
    const upper = segmented(8, [
      { x: 424, y: 207 },
      { x: 492, y: 264 },
    ]);
    const lower = segmented(9, [
      { x: 492, y: 294 },
      { x: 428, y: 344 },
    ]);

    expect(findChevrons([upper, lower], THRESHOLDS)).toEqual([]);
  });

  it('does not join two single strokes that continue each other in a straight line', () => {
    const first = segmented(1, [
      { x: 100, y: 200 },
      { x: 200, y: 200 },
    ]);
    const second = segmented(2, [
      { x: 200, y: 200 },
      { x: 300, y: 200 },
    ]);

    expect(findChevrons([first, second], THRESHOLDS)).toEqual([]);
  });

  it('uses every single stroke in at most one chevron', () => {
    const a = segmented(1, [
      { x: 150, y: 200 },
      { x: 250, y: 240 },
    ]);
    const b = segmented(2, [
      { x: 250, y: 240 },
      { x: 150, y: 280 },
    ]);
    const c = segmented(3, [
      { x: 250, y: 240 },
      { x: 160, y: 300 },
    ]);

    expect(findChevrons([a, b, c], THRESHOLDS)).toHaveLength(1);
  });

  it('finds "<" and "Λ" drawn as two strokes, as in the recorded sketches', () => {
    const turn = segmented(1, [
      { x: 350, y: 200 },
      { x: 250, y: 240 },
      { x: 350, y: 280 },
    ]);
    const tilt = segmented(2, [
      { x: 260, y: 330 },
      { x: 300, y: 170 },
      { x: 340, y: 330 },
    ]);
    const directions = findChevrons([turn, tilt], THRESHOLDS).map((c) => c.direction);

    expect([...directions].sort()).toEqual(['left', 'up']);
  });
});
