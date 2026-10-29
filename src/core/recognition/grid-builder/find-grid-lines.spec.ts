import { describe, expect, it } from 'vitest';
import { BoundingBox } from '../../geometry/bounding-box';
import { Orientation } from '../../geometry/segment';
import { AxisLine } from './axis-lines';
import { findDividers, findFrame, findGridLines } from './find-grid-lines';
import { GridThresholds } from './grid-builder-config';

const THRESHOLDS: GridThresholds = {
  minSideCoverage: 0.5,
  maxEndGapRatio: 0.15,
};

function axis(
  orientation: Orientation,
  position: number,
  start: number,
  end: number,
  strokeIds: readonly number[] = [1],
  doubled = false,
): AxisLine {
  return { orientation, position, start, end, strokeIds, doubled };
}

const top = axis('horizontal', 100, 100, 500, [1]);
const bottom = axis('horizontal', 400, 100, 500, [2]);
const left = axis('vertical', 100, 100, 400, [3]);
const right = axis('vertical', 500, 100, 400, [4]);
const sides = [top, bottom, left, right];

const FRAME: BoundingBox = { minX: 100, maxX: 500, minY: 100, maxY: 400 };

describe('findFrame', () => {
  it('returns null for no lines', () => {
    expect(findFrame([], THRESHOLDS.minSideCoverage)).toBeNull();
  });

  it('returns null without at least two vertical and two horizontal lines', () => {
    expect(findFrame([top, bottom, left], THRESHOLDS.minSideCoverage)).toBeNull();
    expect(findFrame([top, left, right], THRESHOLDS.minSideCoverage)).toBeNull();
  });

  it('builds the frame from the positions of the four sides', () => {
    expect(findFrame(sides, THRESHOLDS.minSideCoverage)).toEqual({ frame: FRAME, inner: [] });
  });

  it('does not depend on the order of the lines', () => {
    const result = findFrame([right, top, left, bottom], THRESHOLDS.minSideCoverage);
    expect(result?.frame).toEqual(FRAME);
  });

  it('takes the outermost lines as the frame and returns the rest as inner lines', () => {
    const divider = axis('vertical', 300, 110, 390, [5]);
    const transom = axis('horizontal', 250, 105, 495, [6]);
    const result = findFrame(
      [top, divider, bottom, left, transom, right],
      THRESHOLDS.minSideCoverage,
    );

    expect(result?.frame).toEqual(FRAME);
    expect(result?.inner).toHaveLength(2);
    expect(result?.inner[0]).toBe(divider);
    expect(result?.inner[1]).toBe(transom);
  });

  it('accepts an open corner, because only the positions of the sides matter', () => {
    const shortTop = axis('horizontal', 100, 100, 370, [1]);
    const shortRight = axis('vertical', 500, 170, 400, [4]);
    const result = findFrame([shortTop, bottom, left, shortRight], THRESHOLDS.minSideCoverage);

    expect(result?.frame).toEqual(FRAME);
  });

  it('accepts a side covering exactly the minimum and rejects one covering less', () => {
    const half = axis('horizontal', 100, 100, 300, [1]);
    const lessThanHalf = axis('horizontal', 100, 100, 299, [1]);

    expect(findFrame([half, bottom, left, right], THRESHOLDS.minSideCoverage)).not.toBeNull();
    expect(findFrame([lessThanHalf, bottom, left, right], THRESHOLDS.minSideCoverage)).toBeNull();
  });

  it('checks the coverage of vertical sides too', () => {
    const shortLeft = axis('vertical', 100, 100, 249, [3]);
    expect(findFrame([top, bottom, shortLeft, right], THRESHOLDS.minSideCoverage)).toBeNull();
  });

  it('counts only the part of a side that lies within the frame', () => {
    const overshooting = axis('horizontal', 100, 0, 290, [1]);
    expect(findFrame([overshooting, bottom, left, right], THRESHOLDS.minSideCoverage)).toBeNull();
  });

  it('finds the frame of a recorded sketch with an open top-right corner', () => {
    const divider = axis('vertical', 1164, 257, 545, [5]);
    const result = findFrame(
      [
        axis('vertical', 922, 291, 548, [1]),
        axis('horizontal', 549, 914, 1411, [2]),
        axis('vertical', 1420, 327, 549, [3]),
        axis('horizontal', 259, 939, 1290, [4]),
        divider,
      ],
      THRESHOLDS.minSideCoverage,
    );

    expect(result?.frame).toEqual({ minX: 922, maxX: 1420, minY: 259, maxY: 549 });
    expect(result?.inner).toEqual([divider]);
  });
});

describe('findDividers', () => {
  const MAX_END_GAP = THRESHOLDS.maxEndGapRatio;

  it('returns nothing for no inner lines', () => {
    expect(findDividers([], FRAME, MAX_END_GAP)).toEqual({ dividers: [], rejected: [] });
  });

  it('accepts a vertical divider from top to bottom and snaps its ends to the frame', () => {
    const divider = axis('vertical', 300, 110, 390, [5]);
    const { dividers, rejected } = findDividers([divider], FRAME, MAX_END_GAP);

    expect(dividers).toEqual([axis('vertical', 300, 100, 400, [5])]);
    expect(rejected).toEqual([]);
  });

  it('accepts a horizontal divider from left to right and snaps its ends to the frame', () => {
    const transom = axis('horizontal', 200, 140, 455, [6]);
    const { dividers } = findDividers([transom], FRAME, MAX_END_GAP);

    expect(dividers).toEqual([axis('horizontal', 200, 100, 500, [6])]);
  });

  it('snaps a divider that overshoots the frame', () => {
    const divider = axis('vertical', 300, 80, 420, [5]);
    const { dividers } = findDividers([divider], FRAME, MAX_END_GAP);

    expect(dividers).toEqual([axis('vertical', 300, 100, 400, [5])]);
  });

  it('measures the end gap relative to the frame size along the divider', () => {
    const vertical = axis('vertical', 300, 145, 355, [5]);
    const horizontal = axis('horizontal', 250, 160, 440, [6]);
    const { dividers, rejected } = findDividers([vertical, horizontal], FRAME, MAX_END_GAP);

    expect(dividers).toHaveLength(2);
    expect(rejected).toEqual([]);
  });

  it('rejects a divider whose end gap is just over the limit', () => {
    const vertical = axis('vertical', 300, 146, 390, [5]);
    const horizontal = axis('horizontal', 250, 105, 439, [6]);
    const { dividers, rejected } = findDividers([vertical, horizontal], FRAME, MAX_END_GAP);

    expect(dividers).toEqual([]);
    expect(rejected).toEqual([vertical, horizontal]);
  });

  it('rejects a line that reaches the frame with only one end', () => {
    const halfway = axis('vertical', 300, 110, 250, [5]);
    const { dividers, rejected } = findDividers([halfway], FRAME, MAX_END_GAP);

    expect(dividers).toEqual([]);
    expect(rejected).toEqual([halfway]);
  });

  it('rejects a lone line in the middle of a pane, such as a symbol arm drawn as its own stroke', () => {
    const arm = axis('vertical', 250, 180, 320, [7]);
    const { rejected } = findDividers([arm], FRAME, MAX_END_GAP);

    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toBe(arm);
  });

  it('accepts a divider that ends on another divider (T-junction), whatever the input order', () => {
    const belowTransom = axis('vertical', 300, 205, 395, [5]);
    const transom = axis('horizontal', 200, 105, 495, [6]);
    const { dividers, rejected } = findDividers([belowTransom, transom], FRAME, MAX_END_GAP);

    expect(rejected).toEqual([]);
    expect(dividers).toHaveLength(2);
    expect(dividers).toContainEqual(axis('horizontal', 200, 100, 500, [6]));
    expect(dividers).toContainEqual(axis('vertical', 300, 200, 400, [5]));
  });

  it('accepts a horizontal divider between a side and a vertical divider', () => {
    const divider = axis('vertical', 300, 110, 390, [5]);
    const leftPaneTransom = axis('horizontal', 250, 105, 295, [6]);
    const { dividers } = findDividers([leftPaneTransom, divider], FRAME, MAX_END_GAP);

    expect(dividers).toContainEqual(axis('horizontal', 250, 100, 300, [6]));
  });

  it('only counts a divider as a boundary where that divider actually reaches', () => {
    const transom = axis('horizontal', 200, 105, 495, [6]);
    const belowTransom = axis('vertical', 300, 205, 395, [5]);
    const aboveTransom = axis('horizontal', 150, 105, 295, [8]);
    const { dividers, rejected } = findDividers(
      [transom, belowTransom, aboveTransom],
      FRAME,
      MAX_END_GAP,
    );

    expect(dividers).toHaveLength(2);
    expect(rejected).toEqual([aboveTransom]);
  });

  it('keeps a double line doubled after snapping it', () => {
    const mullion = axis('vertical', 300, 110, 390, [5, 6], true);
    const { dividers } = findDividers([mullion], FRAME, MAX_END_GAP);

    expect(dividers).toEqual([axis('vertical', 300, 100, 400, [5, 6], true)]);
  });

  it('keeps the rejected lines in input order', () => {
    const a = axis('vertical', 250, 180, 320, [7]);
    const b = axis('horizontal', 250, 200, 300, [8]);
    const c = axis('vertical', 350, 180, 320, [9]);

    expect(findDividers([a, b, c], FRAME, MAX_END_GAP).rejected).toEqual([a, b, c]);
  });

  it('does not change its input', () => {
    const divider = axis('vertical', 300, 110, 390, [5]);
    const input = [divider];
    const copy = structuredClone(input);

    findDividers(input, FRAME, MAX_END_GAP);

    expect(input).toEqual(copy);
  });
});

describe('findGridLines', () => {
  it('returns null when there is no frame', () => {
    expect(findGridLines([top, left], THRESHOLDS)).toBeNull();
  });

  it('returns the frame, the snapped dividers and the rejected lines', () => {
    const divider = axis('vertical', 300, 110, 390, [5]);
    const stray = axis('vertical', 250, 180, 320, [7]);

    expect(findGridLines([...sides, divider, stray], THRESHOLDS)).toEqual({
      frame: FRAME,
      dividers: [axis('vertical', 300, 100, 400, [5])],
      rejected: [stray],
    });
  });

  it('uses the given thresholds', () => {
    const divider = axis('vertical', 300, 110, 390, [5]);
    const strict: GridThresholds = { minSideCoverage: 0.5, maxEndGapRatio: 0.01 };

    expect(findGridLines([...sides, divider], strict)?.rejected).toEqual([divider]);
  });

  it('finds the frame and the divider of a recorded sketch', () => {
    const result = findGridLines(
      [
        axis('vertical', 922, 291, 548, [1]),
        axis('horizontal', 549, 914, 1411, [2]),
        axis('vertical', 1420, 327, 549, [3]),
        axis('horizontal', 259, 939, 1290, [4]),
        axis('vertical', 1164, 257, 545, [5]),
      ],
      THRESHOLDS,
    );

    expect(result).toEqual({
      frame: { minX: 922, maxX: 1420, minY: 259, maxY: 549 },
      dividers: [axis('vertical', 1164, 259, 549, [5])],
      rejected: [],
    });
  });
});
