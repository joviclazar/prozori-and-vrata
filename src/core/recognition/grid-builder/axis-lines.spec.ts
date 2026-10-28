import { describe, expect, it } from 'vitest';
import { Orientation } from '../../geometry/segment';
import { StructuralLine } from '../stroke-classifier/extract-structural-lines';
import { AxisLine, mergeCollinear, toAxisLine } from './axis-lines';
import { MergeThresholds } from './grid-builder-config';

const THRESHOLDS: MergeThresholds = {
  maxPositionDiffRatio: 0.1,
  maxGapRatio: 0.1,
};

function structural(
  orientation: Orientation,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeId = 1,
): StructuralLine {
  return { segment: { start: { x: x1, y: y1 }, end: { x: x2, y: y2 } }, orientation, strokeId };
}

function axis(
  orientation: Orientation,
  position: number,
  start: number,
  end: number,
  strokeIds: readonly number[] = [1],
): AxisLine {
  return { orientation, position, start, end, strokeIds };
}

const anchor = axis('vertical', 0, 0, 400, [99]);

function horizontals(lines: readonly AxisLine[]): AxisLine[] {
  return lines.filter((l) => l.orientation === 'horizontal');
}

describe('toAxisLine', () => {
  it('turns a horizontal segment into its average y and its x range', () => {
    expect(toAxisLine(structural('horizontal', 813, 204, 1396, 208, 4))).toEqual(
      axis('horizontal', 206, 813, 1396, [4]),
    );
  });

  it('turns a vertical segment into its average x and its y range', () => {
    expect(toAxisLine(structural('vertical', 982, 319, 980, 647, 1))).toEqual(
      axis('vertical', 981, 319, 647, [1]),
    );
  });

  it('keeps start before end regardless of the drawing direction', () => {
    expect(toAxisLine(structural('horizontal', 1396, 208, 813, 204, 4))).toEqual(
      axis('horizontal', 206, 813, 1396, [4]),
    );
    expect(toAxisLine(structural('vertical', 980, 647, 982, 319, 1))).toEqual(
      axis('vertical', 981, 319, 647, [1]),
    );
  });

  it('straightens a line whose end drifts away from its start', () => {
    expect(toAxisLine(structural('horizontal', 100, 100, 500, 156))).toEqual(
      axis('horizontal', 128, 100, 500),
    );
  });
});

describe('mergeCollinear', () => {
  it('returns nothing for no lines', () => {
    expect(mergeCollinear([], THRESHOLDS)).toEqual([]);
  });

  it('keeps a single line as it is', () => {
    expect(mergeCollinear([anchor], THRESHOLDS)).toEqual([anchor]);
  });

  it('keeps a frame with a divider as five lines', () => {
    const frame = [
      axis('horizontal', 313, 977, 1321, [2]),
      axis('vertical', 1324, 309, 653, [2]),
      axis('horizontal', 650, 980, 1326, [2]),
      axis('vertical', 982, 319, 647, [1]),
      axis('vertical', 1150, 320, 640, [3]),
    ];
    const result = mergeCollinear(frame, THRESHOLDS);

    expect(result).toHaveLength(5);
    expect(result).toEqual(expect.arrayContaining(frame));
  });

  it('merges a side drawn in two parts with a small gap between them', () => {
    const left = axis('horizontal', 100, 0, 200, [1]);
    const right = axis('horizontal', 110, 230, 430, [2]);
    const result = mergeCollinear([anchor, left, right], THRESHOLDS);

    expect(result).toHaveLength(2);
    const [merged] = horizontals(result);
    expect(merged.start).toBe(0);
    expect(merged.end).toBe(430);
    expect(merged.position).toBeCloseTo(105);
    expect([...merged.strokeIds].sort()).toEqual([1, 2]);
  });

  it('merges vertical lines the same way', () => {
    const top = axis('vertical', 300, 0, 200, [1]);
    const bottom = axis('vertical', 290, 210, 410, [2]);
    const result = mergeCollinear([top, bottom], THRESHOLDS);

    expect(result).toHaveLength(1);
    expect(result[0].orientation).toBe('vertical');
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(410);
    expect(result[0].position).toBeCloseTo(295);
  });

  it('merges a line traced twice, weighting the position by length', () => {
    const first = axis('horizontal', 100, 0, 400, [1]);
    const second = axis('horizontal', 104, 20, 380, [2]);
    const [merged] = mergeCollinear([first, second], THRESHOLDS);

    expect(merged.start).toBe(0);
    expect(merged.end).toBe(400);
    expect(merged.position).toBeCloseTo((100 * 400 + 104 * 360) / 760);
  });

  it('accepts a gap exactly at the limit and rejects a larger one', () => {
    const left = axis('horizontal', 100, 0, 200, [1]);
    const atLimit = axis('horizontal', 100, 240, 440, [2]);
    const beyond = axis('horizontal', 100, 241, 441, [3]);

    expect(horizontals(mergeCollinear([anchor, left, atLimit], THRESHOLDS))).toHaveLength(1);
    expect(horizontals(mergeCollinear([anchor, left, beyond], THRESHOLDS))).toHaveLength(2);
  });

  it('accepts a position difference exactly at the limit and rejects a larger one', () => {
    const line = axis('horizontal', 100, 0, 300, [1]);
    const atLimit = axis('horizontal', 140, 0, 300, [2]);
    const beyond = axis('horizontal', 141, 0, 300, [3]);

    expect(horizontals(mergeCollinear([anchor, line, atLimit], THRESHOLDS))).toHaveLength(1);
    expect(horizontals(mergeCollinear([anchor, line, beyond], THRESHOLDS))).toHaveLength(2);
  });

  it('measures both limits relative to the longest input line', () => {
    const left = axis('horizontal', 100, 0, 200, [1]);
    const right = axis('horizontal', 100, 230, 430, [2]);

    expect(mergeCollinear([left, right], THRESHOLDS)).toHaveLength(2);
    expect(horizontals(mergeCollinear([anchor, left, right], THRESHOLDS))).toHaveLength(1);
  });

  it('never merges lines of different orientation', () => {
    const horizontal = axis('horizontal', 100, 0, 400, [1]);
    const vertical = axis('vertical', 100, 0, 400, [2]);

    expect(mergeCollinear([horizontal, vertical], THRESHOLDS)).toHaveLength(2);
  });

  it('merges a chain of parts even when the outer parts are too far apart to merge directly', () => {
    const a = axis('horizontal', 100, 0, 100, [1]);
    const b = axis('horizontal', 100, 120, 220, [2]);
    const c = axis('horizontal', 100, 240, 340, [3]);
    const result = mergeCollinear([anchor, a, c, b], THRESHOLDS);

    const merged = horizontals(result);
    expect(merged).toHaveLength(1);
    expect(merged[0].start).toBe(0);
    expect(merged[0].end).toBe(340);
    expect([...merged[0].strokeIds].sort()).toEqual([1, 2, 3]);
  });

  it('does not change its input', () => {
    const left = axis('horizontal', 100, 0, 200, [1]);
    const right = axis('horizontal', 110, 230, 430, [2]);
    const input = [anchor, left, right];
    const copy = structuredClone(input);

    mergeCollinear(input, THRESHOLDS);

    expect(input).toEqual(copy);
  });
});
