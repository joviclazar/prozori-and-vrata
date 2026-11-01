import { describe, expect, it } from 'vitest';
import { Point } from '../../core/geometry/point';
import { Stroke, StrokePoint } from '../../core/model/stroke';
import { parseSketch } from '../../core/recognition/sketch-parser';
import { beautify } from './beautify';

function polyline(id: number, vertices: readonly Point[], stepsPerSegment = 20): Stroke {
  const points: StrokePoint[] = [];
  for (let v = 1; v < vertices.length; v++) {
    const from = vertices[v - 1];
    const to = vertices[v];
    for (let s = v === 1 ? 0 : 1; s <= stepsPerSegment; s++) {
      points.push({
        x: from.x + ((to.x - from.x) * s) / stepsPerSegment,
        y: from.y + ((to.y - from.y) * s) / stepsPerSegment,
        time: points.length * 10,
      });
    }
  }
  return { id, pointerType: 'mouse', points };
}

const frame = polyline(1, [
  { x: 100, y: 100 },
  { x: 500, y: 100 },
  { x: 500, y: 400 },
  { x: 100, y: 400 },
  { x: 100, y: 100 },
]);
const divider = polyline(2, [
  { x: 300, y: 105 },
  { x: 302, y: 395 },
]);
const chevron = polyline(3, [
  { x: 150, y: 200 },
  { x: 250, y: 240 },
  { x: 150, y: 280 },
]);
const click = polyline(4, [
  { x: 50, y: 50 },
  { x: 51, y: 51 },
]);
const floating = polyline(5, [
  { x: 400, y: 180 },
  { x: 400, y: 320 },
]);

const tilt = polyline(6, [
  { x: 120, y: 330 },
  { x: 160, y: 170 },
  { x: 200, y: 330 },
]);
const note = polyline(7, [
  { x: 130, y: 370 },
  { x: 180, y: 370 },
]);
const vee = polyline(8, [
  { x: 350, y: 200 },
  { x: 400, y: 280 },
  { x: 450, y: 200 },
]);

function run(strokes: readonly Stroke[]) {
  return beautify(strokes, parseSketch(strokes));
}

describe('beautify', () => {
  it('keeps every stroke hand-drawn while there is no frame', () => {
    const strokes = [divider, chevron];

    expect(run(strokes)).toEqual({ frame: null, dividers: [], symbols: [], handDrawn: strokes });
  });

  it('replaces the frame and the divider with clean lines', () => {
    const result = run([frame, divider]);

    expect(result.frame).toEqual({ minX: 100, maxX: 500, minY: 100, maxY: 400 });
    expect(result.dividers).toHaveLength(1);
    expect(result.handDrawn).toEqual([]);
  });

  it('replaces a recognized symbol with a clean symbol for its cell', () => {
    const result = run([frame, chevron, tilt, divider]);

    expect(result.symbols).toEqual([
      {
        bounds: { minX: 100, maxX: 301, minY: 100, maxY: 400 },
        opening: 'tilt_turn',
        hinge: 'left',
      },
    ]);
    expect(result.handDrawn).toEqual([]);
  });

  it('draws no symbol for fixed glass', () => {
    expect(run([frame, divider]).symbols).toEqual([]);
  });

  it('keeps strokes in a cell that are not part of the symbol hand-drawn', () => {
    const result = run([frame, chevron, note, divider]);

    expect(result.symbols).toHaveLength(1);
    expect(result.handDrawn).toEqual([note]);
  });

  it('keeps an unknown symbol hand-drawn and draws no clean symbol for it', () => {
    const result = run([frame, divider, vee]);

    expect(result.symbols).toEqual([]);
    expect(result.handDrawn).toEqual([vee]);
  });

  it('hides noise such as an accidental click', () => {
    expect(run([frame, click]).handDrawn).toEqual([]);
  });

  it('keeps a line that is not part of the grid hand-drawn, so it does not disappear', () => {
    const result = run([frame, floating]);

    expect(result.dividers).toEqual([]);
    expect(result.handDrawn).toEqual([floating]);
  });
});
