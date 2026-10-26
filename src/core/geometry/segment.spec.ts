import { describe, expect, it } from 'vitest';
import {
  cornerAngle,
  distanceToSegment,
  segmentLength,
  segmentOrientation,
  toSegments,
} from './segment';

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

describe('toSegments', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 0, y: 100 };
  const p2 = { x: 80, y: 100 };
  const p3 = { x: 80, y: 0 };

  it('returns no segments for an empty list', () => {
    expect(toSegments([])).toEqual([]);
  });

  it('returns no segments for a single vertex', () => {
    expect(toSegments([p0])).toEqual([]);
  });

  it('returns one segment for two vertices', () => {
    expect(toSegments([p0, p1])).toEqual([{ start: p0, end: p1 }]);
  });

  it('connects consecutive vertices, so neighbouring segments share a vertex', () => {
    expect(toSegments([p0, p1, p2, p3])).toEqual([
      { start: p0, end: p1 },
      { start: p1, end: p2 },
      { start: p2, end: p3 },
    ]);
  });

  it('uses the original vertex objects', () => {
    const [segment] = toSegments([p0, p1]);
    expect(segment.start).toBe(p0);
    expect(segment.end).toBe(p1);
  });
});

describe('segmentLength', () => {
  it('is the distance between the endpoints', () => {
    expect(segmentLength({ start: { x: 0, y: 0 }, end: { x: 3, y: 4 } })).toBe(5);
  });

  it('is zero for a zero-length segment', () => {
    expect(segmentLength({ start: { x: 2, y: 2 }, end: { x: 2, y: 2 } })).toBe(0);
  });

  it('does not depend on the direction of the segment', () => {
    const p = { x: -1, y: 7 };
    const q = { x: 4, y: -5 };
    expect(segmentLength({ start: p, end: q })).toBe(segmentLength({ start: q, end: p }));
  });
});

describe('segmentOrientation', () => {
  const MAX_DEVIATION = 20;
  const origin = { x: 0, y: 0 };

  function towards(deg: number, length = 100) {
    const rad = (deg * Math.PI) / 180;
    return { start: origin, end: { x: length * Math.cos(rad), y: length * Math.sin(rad) } };
  }

  it('recognizes an exactly horizontal segment', () => {
    expect(segmentOrientation({ start: origin, end: { x: 100, y: 0 } }, MAX_DEVIATION)).toBe(
      'horizontal',
    );
  });

  it('recognizes an exactly vertical segment', () => {
    expect(segmentOrientation({ start: origin, end: { x: 0, y: 100 } }, MAX_DEVIATION)).toBe(
      'vertical',
    );
  });

  it('does not depend on the drawing direction', () => {
    expect(segmentOrientation({ start: origin, end: { x: -100, y: 0 } }, MAX_DEVIATION)).toBe(
      'horizontal',
    );
    expect(segmentOrientation({ start: origin, end: { x: 0, y: -100 } }, MAX_DEVIATION)).toBe(
      'vertical',
    );
  });

  it('accepts a slightly tilted segment, tilted either way', () => {
    expect(segmentOrientation({ start: origin, end: { x: 100, y: 10 } }, MAX_DEVIATION)).toBe(
      'horizontal',
    );
    expect(segmentOrientation({ start: origin, end: { x: 100, y: -10 } }, MAX_DEVIATION)).toBe(
      'horizontal',
    );
    expect(segmentOrientation({ start: origin, end: { x: 10, y: 100 } }, MAX_DEVIATION)).toBe(
      'vertical',
    );
    expect(segmentOrientation({ start: origin, end: { x: -10, y: 100 } }, MAX_DEVIATION)).toBe(
      'vertical',
    );
  });

  it('accepts a deviation just inside the limit and rejects one just outside', () => {
    expect(segmentOrientation(towards(19), MAX_DEVIATION)).toBe('horizontal');
    expect(segmentOrientation(towards(21), MAX_DEVIATION)).toBeNull();
    expect(segmentOrientation(towards(71), MAX_DEVIATION)).toBe('vertical');
    expect(segmentOrientation(towards(69), MAX_DEVIATION)).toBeNull();
  });

  it('works in every quadrant', () => {
    expect(segmentOrientation(towards(175), MAX_DEVIATION)).toBe('horizontal');
    expect(segmentOrientation(towards(-170), MAX_DEVIATION)).toBe('horizontal');
    expect(segmentOrientation(towards(-95), MAX_DEVIATION)).toBe('vertical');
    expect(segmentOrientation(towards(260), MAX_DEVIATION)).toBe('vertical');
  });

  it('returns null for a diagonal segment', () => {
    expect(segmentOrientation(towards(45), MAX_DEVIATION)).toBeNull();
    expect(segmentOrientation(towards(135), MAX_DEVIATION)).toBeNull();
  });

  it('uses the given limit', () => {
    expect(segmentOrientation(towards(10), 5)).toBeNull();
    expect(segmentOrientation(towards(10), 15)).toBe('horizontal');
  });
});

describe('cornerAngle', () => {
  const corner = { x: 100, y: 100 };

  function from(p: { x: number; y: number }) {
    return { start: p, end: corner };
  }

  function to(p: { x: number; y: number }) {
    return { start: corner, end: p };
  }

  it('is 90 for a right angle', () => {
    expect(cornerAngle(from({ x: 100, y: 0 }), to({ x: 200, y: 100 }))).toBeCloseTo(90);
  });

  it('is 180 when the stroke continues straight on', () => {
    expect(cornerAngle(from({ x: 0, y: 100 }), to({ x: 200, y: 100 }))).toBeCloseTo(180);
  });

  it('is 0 when the stroke turns back on itself', () => {
    expect(cornerAngle(from({ x: 0, y: 100 }), to({ x: 0, y: 100 }))).toBeCloseTo(0);
  });

  it('measures the angle between the two arms at the shared vertex', () => {
    expect(cornerAngle(from({ x: 0, y: 50 }), to({ x: 0, y: 150 }))).toBeCloseTo(53.13, 2);
  });

  it('does not depend on whether the stroke turns left or right', () => {
    const left = cornerAngle(from({ x: 100, y: 0 }), to({ x: 0, y: 100 }));
    const right = cornerAngle(from({ x: 100, y: 0 }), to({ x: 200, y: 100 }));
    expect(left).toBeCloseTo(right);
  });

  it('does not depend on the arm lengths', () => {
    expect(cornerAngle(from({ x: 100, y: 90 }), to({ x: 600, y: 100 }))).toBeCloseTo(90);
  });

  it('throws for a zero-length arm', () => {
    expect(() => cornerAngle(from(corner), to({ x: 200, y: 100 }))).toThrow();
    expect(() => cornerAngle(from({ x: 0, y: 100 }), to(corner))).toThrow();
  });
});
