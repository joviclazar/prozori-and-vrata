import { describe, expect, it } from 'vitest';
import { Point } from '../../geometry/point';
import { toSegments } from '../../geometry/segment';
import { Stroke } from '../../model/stroke';
import { SegmentedStroke } from '../segmentation/segment-strokes';
import { extractStructuralLines } from './extract-structural-lines';
import { StructuralLineThresholds } from './structural-lines-config';

const THRESHOLDS: StructuralLineThresholds = {
  minLengthRatio: 0.25,
  maxAxisDeviationDeg: 20,
  sharpCornerDeg: 75,
  minArmRatio: 0.25,
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
  return { x: from.x + length * Math.cos(rad), y: from.y + length * Math.sin(rad) };
}

const topLeft = { x: 100, y: 100 };
const topRight = { x: 500, y: 100 };
const bottomRight = { x: 500, y: 400 };
const bottomLeft = { x: 100, y: 400 };

function fourStrokeFrame(): SegmentedStroke[] {
  return [
    segmented(1, [topLeft, topRight]),
    segmented(2, [topRight, bottomRight]),
    segmented(3, [bottomRight, bottomLeft]),
    segmented(4, [bottomLeft, topLeft]),
  ];
}

describe('extractStructuralLines', () => {
  it('returns nothing for no strokes', () => {
    expect(extractStructuralLines([], THRESHOLDS)).toEqual({ lines: [], annotations: [] });
  });

  it('turns a frame drawn with four strokes into four lines', () => {
    const { lines, annotations } = extractStructuralLines(fourStrokeFrame(), THRESHOLDS);

    expect(lines.map((l) => l.strokeId)).toEqual([1, 2, 3, 4]);
    expect(lines.map((l) => l.orientation)).toEqual([
      'horizontal',
      'vertical',
      'horizontal',
      'vertical',
    ]);
    expect(annotations).toEqual([]);
  });

  it('keeps the original segment objects', () => {
    const strokes = fourStrokeFrame();
    const { lines } = extractStructuralLines(strokes, THRESHOLDS);

    lines.forEach((line, i) => expect(line.segment).toBe(strokes[i].segments[0]));
  });

  it('turns a closed frame drawn with one stroke into four lines, because its corners are right angles', () => {
    const frame = segmented(1, [topLeft, topRight, bottomRight, bottomLeft, topLeft]);
    const { lines, annotations } = extractStructuralLines([frame], THRESHOLDS);

    expect(lines.map((l) => l.segment)).toEqual(frame.segments);
    expect(lines.every((l) => l.strokeId === 1)).toBe(true);
    expect(annotations).toEqual([]);
  });

  it('accepts a slightly tilted line', () => {
    const tilted = segmented(5, [
      { x: 300, y: 110 },
      { x: 330, y: 390 },
    ]);
    const { lines } = extractStructuralLines([...fourStrokeFrame(), tilted], THRESHOLDS);

    expect(lines.map((l) => l.strokeId)).toContain(5);
    expect(lines.find((l) => l.strokeId === 5)?.orientation).toBe('vertical');
  });

  it('accepts a deviation from the axis just inside the limit and rejects one just outside', () => {
    const start = { x: 120, y: 150 };
    const inside = segmented(5, [start, towards(start, 19, 300)]);
    const outside = segmented(6, [start, towards(start, 21, 300)]);
    const { lines, annotations } = extractStructuralLines(
      [...fourStrokeFrame(), inside, outside],
      THRESHOLDS,
    );

    expect(lines.map((l) => l.strokeId)).toContain(5);
    expect(annotations).toEqual([outside.stroke]);
  });

  it('puts a diagonal line into the annotations', () => {
    const diagonal = segmented(5, [topLeft, bottomRight]);
    const { lines, annotations } = extractStructuralLines(
      [...fourStrokeFrame(), diagonal],
      THRESHOLDS,
    );

    expect(lines).toHaveLength(4);
    expect(annotations).toEqual([diagonal.stroke]);
  });

  it('puts a line shorter than the limit into the annotations', () => {
    const short = segmented(5, [
      { x: 200, y: 200 },
      { x: 299, y: 200 },
    ]);
    const { annotations } = extractStructuralLines([...fourStrokeFrame(), short], THRESHOLDS);

    expect(annotations).toEqual([short.stroke]);
  });

  it('accepts a line exactly as long as the limit', () => {
    const exact = segmented(5, [
      { x: 200, y: 200 },
      { x: 300, y: 200 },
    ]);
    const { lines, annotations } = extractStructuralLines(
      [...fourStrokeFrame(), exact],
      THRESHOLDS,
    );

    expect(lines.map((l) => l.strokeId)).toContain(5);
    expect(annotations).toEqual([]);
  });

  it('measures length relative to the longest segment in the sketch, not in pixels', () => {
    const small = segmented(1, [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ]);
    expect(extractStructuralLines([small], THRESHOLDS).lines).toHaveLength(1);

    const long = segmented(2, [
      { x: 0, y: 100 },
      { x: 400, y: 100 },
    ]);
    const { lines, annotations } = extractStructuralLines([small, long], THRESHOLDS);
    expect(lines.map((l) => l.strokeId)).toEqual([2]);
    expect(annotations).toEqual([small.stroke]);
  });

  it('puts a flat ">" into the annotations, although each arm alone looks like a horizontal line', () => {
    const chevron = segmented(5, [
      { x: 150, y: 200 },
      { x: 350, y: 240 },
      { x: 150, y: 280 },
    ]);
    const { lines, annotations } = extractStructuralLines(
      [...fourStrokeFrame(), chevron],
      THRESHOLDS,
    );

    expect(lines.map((l) => l.strokeId)).toEqual([1, 2, 3, 4]);
    expect(annotations).toEqual([chevron.stroke]);
  });

  it('puts a narrow "Λ" into the annotations, although each arm alone looks like a vertical line', () => {
    const tilt = segmented(5, [
      { x: 260, y: 380 },
      { x: 300, y: 180 },
      { x: 340, y: 380 },
    ]);
    const { lines, annotations } = extractStructuralLines([...fourStrokeFrame(), tilt], THRESHOLDS);

    expect(lines.map((l) => l.strokeId)).toEqual([1, 2, 3, 4]);
    expect(annotations).toEqual([tilt.stroke]);
  });

  it('drops a short hook at the end of a line and keeps the line', () => {
    const hook = { x: 470, y: 115 };
    const lineWithHook = segmented(1, [topLeft, topRight, hook]);
    const { lines, annotations } = extractStructuralLines(
      [lineWithHook, ...fourStrokeFrame().slice(1)],
      THRESHOLDS,
    );

    expect(lines.filter((l) => l.strokeId === 1).map((l) => l.segment)).toEqual([
      lineWithHook.segments[0],
    ]);
    expect(annotations).toEqual([]);
  });

  it('vetoes a sharp corner only when the shorter arm is long enough compared to the longer one', () => {
    const corner = { x: 400, y: 200 };
    const longArmStart = { x: 120, y: 200 };
    const angleBack = 180 - 30;
    const balanced = segmented(5, [longArmStart, corner, towards(corner, angleBack, 80)]);
    const unbalanced = segmented(6, [
      { x: longArmStart.x, y: 300 },
      { x: corner.x, y: 300 },
      towards({ x: corner.x, y: 300 }, angleBack, 60),
    ]);
    const { lines, annotations } = extractStructuralLines(
      [...fourStrokeFrame(), balanced, unbalanced],
      THRESHOLDS,
    );

    expect(annotations).toEqual([balanced.stroke]);
    expect(lines.filter((l) => l.strokeId === 6).map((l) => l.segment)).toEqual([
      unbalanced.segments[0],
    ]);
  });

  it('puts a stroke without any structural segment into the annotations, with all of its points', () => {
    const digit = segmented(5, [
      { x: 520, y: 200 },
      { x: 560, y: 200 },
      { x: 530, y: 260 },
    ]);
    const { annotations } = extractStructuralLines([...fourStrokeFrame(), digit], THRESHOLDS);

    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toBe(digit.stroke);
  });

  it('keeps the input order in both lines and annotations', () => {
    const chevron = segmented(10, [
      { x: 150, y: 200 },
      { x: 350, y: 240 },
      { x: 150, y: 280 },
    ]);
    const digit = segmented(11, [
      { x: 520, y: 200 },
      { x: 540, y: 220 },
    ]);
    const [top, right, bottom, left] = fourStrokeFrame();
    const { lines, annotations } = extractStructuralLines(
      [digit, right, chevron, top, left, bottom],
      THRESHOLDS,
    );

    expect(lines.map((l) => l.strokeId)).toEqual([2, 1, 4, 3]);
    expect(annotations).toEqual([digit.stroke, chevron.stroke]);
  });
});
