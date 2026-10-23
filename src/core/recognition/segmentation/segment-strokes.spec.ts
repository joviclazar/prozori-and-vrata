import { describe, expect, it } from 'vitest';
import { Point } from '../../geometry/point';
import { Stroke } from '../../model/stroke';
import { segmentStrokes } from './segment-strokes';

const TOLERANCE = 30;
const MIN_LENGTH = 8;

function stroke(id: number, points: readonly Point[]): Stroke {
  return {
    id,
    pointerType: 'mouse',
    points: points.map((p, i) => ({ x: p.x, y: p.y, time: i * 10 })),
  };
}

function straightLine(from: Point, to: Point, steps = 20): Point[] {
  const points: Point[] = [];
  for (let s = 0; s <= steps; s++) {
    points.push({
      x: from.x + ((to.x - from.x) * s) / steps,
      y: from.y + ((to.y - from.y) * s) / steps,
    });
  }
  return points;
}

describe('segmentStrokes', () => {
  it('returns nothing for no strokes', () => {
    expect(segmentStrokes([], TOLERANCE, MIN_LENGTH)).toEqual([]);
  });

  it('turns a straight stroke into one segment from its first to its last point', () => {
    const line = stroke(1, straightLine({ x: 0, y: 0 }, { x: 0, y: 300 }));
    const [result] = segmentStrokes([line], TOLERANCE, MIN_LENGTH);

    expect(result.stroke).toBe(line);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].start).toBe(line.points[0]);
    expect(result.segments[0].end).toBe(line.points[line.points.length - 1]);
  });

  it('splits an L-shaped stroke at its corner', () => {
    const points = [
      ...straightLine({ x: 0, y: 0 }, { x: 0, y: 200 }),
      ...straightLine({ x: 0, y: 200 }, { x: 150, y: 200 }).slice(1),
    ];
    const lShape = stroke(1, points);
    const corner = lShape.points[20];
    const last = lShape.points[lShape.points.length - 1];

    const [result] = segmentStrokes([lShape], TOLERANCE, MIN_LENGTH);

    expect(result.segments).toEqual([
      { start: lShape.points[0], end: corner },
      { start: corner, end: last },
    ]);
  });

  it('ignores hand jitter smaller than the tolerance', () => {
    const points: Point[] = [];
    for (let i = 0; i <= 30; i++) {
      points.push({ x: i * 10, y: i % 2 === 0 ? 0 : 10 });
    }
    const wobbly = stroke(1, points);

    expect(segmentStrokes([wobbly], TOLERANCE, MIN_LENGTH)[0].segments).toHaveLength(1);
    expect(segmentStrokes([wobbly], 5, MIN_LENGTH)[0].segments.length).toBeGreaterThan(1);
  });

  it('keeps the strokes in their original order', () => {
    const strokes = [
      stroke(7, straightLine({ x: 0, y: 0 }, { x: 100, y: 0 })),
      stroke(3, straightLine({ x: 0, y: 50 }, { x: 100, y: 50 })),
      stroke(5, straightLine({ x: 0, y: 90 }, { x: 100, y: 90 })),
    ];
    const result = segmentStrokes(strokes, TOLERANCE, MIN_LENGTH);
    expect(result.map((r) => r.stroke.id)).toEqual([7, 3, 5]);
  });

  it('drops a single-point stroke (a click)', () => {
    const click = stroke(1, [{ x: 10, y: 10 }]);
    expect(segmentStrokes([click], TOLERANCE, MIN_LENGTH)).toEqual([]);
  });

  it('drops a stroke whose points are all in the same place', () => {
    const click = stroke(1, [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ]);
    expect(segmentStrokes([click], TOLERANCE, MIN_LENGTH)).toEqual([]);
  });

  it('drops a stroke shorter than the minimum length, measured along the path', () => {
    const tiny = stroke(1, [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 4 },
    ]);
    expect(segmentStrokes([tiny], TOLERANCE, MIN_LENGTH)).toEqual([]);
  });

  it('keeps a stroke exactly as long as the minimum length', () => {
    const short = stroke(1, [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ]);
    expect(segmentStrokes([short], TOLERANCE, MIN_LENGTH)).toHaveLength(1);
  });

  it('drops only the noise and keeps the rest', () => {
    const line = stroke(1, straightLine({ x: 0, y: 0 }, { x: 300, y: 0 }));
    const click = stroke(2, [{ x: 50, y: 50 }]);
    const other = stroke(3, straightLine({ x: 0, y: 100 }, { x: 300, y: 100 }));

    const result = segmentStrokes([line, click, other], TOLERANCE, MIN_LENGTH);
    expect(result.map((r) => r.stroke.id)).toEqual([1, 3]);
  });
});
