import { describe, expect, it } from 'vitest';
import { Point } from '../geometry/point';
import { Stroke, StrokePoint } from '../model/stroke';
import { DEFAULT_SKETCH_PARSER_CONFIG, parseSketch } from './sketch-parser';

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

describe('parseSketch', () => {
  it('returns empty stages and no tree for no strokes', () => {
    expect(parseSketch([])).toEqual({
      segmented: [],
      lines: [],
      annotations: [],
      axisLines: [],
      grid: null,
      tree: null,
      cells: [],
      outside: [],
    });
  });

  it('turns a frame with a divider into a tree with two cells', () => {
    const { tree } = parseSketch([frame, divider]);

    expect(tree?.kind).toBe('split');
    expect(tree?.kind === 'split' && tree.direction).toBe('vertical');
    expect(tree?.kind === 'split' && tree.children.map((c) => c.kind)).toEqual(['cell', 'cell']);
  });

  it('keeps symbols in the annotations and drops noise', () => {
    const { annotations, segmented, tree } = parseSketch([frame, chevron, click, divider]);

    expect(annotations).toEqual([chevron]);
    expect(segmented.map((s) => s.stroke.id)).not.toContain(click.id);
    expect(tree?.kind === 'split' && tree.children).toHaveLength(2);
  });

  it('does not depend on the drawing order', () => {
    const forward = parseSketch([frame, divider, chevron]).tree;
    const backward = parseSketch([chevron, divider, frame]).tree;

    expect(backward).toEqual(forward);
  });

  it('returns no tree when no frame is found', () => {
    const { lines, grid, tree } = parseSketch([divider]);

    expect(lines).toHaveLength(1);
    expect(grid).toBeNull();
    expect(tree).toBeNull();
  });

  it('uses the given config', () => {
    const strict = {
      ...DEFAULT_SKETCH_PARSER_CONFIG,
      grid: { ...DEFAULT_SKETCH_PARSER_CONFIG.grid, maxEndGapRatio: 0.001 },
    };
    const { grid, tree } = parseSketch([frame, divider], strict);

    expect(grid?.dividers).toEqual([]);
    expect(grid?.rejected).toHaveLength(1);
    expect(tree?.kind).toBe('cell');
  });

  it('recognizes the opening of every cell', () => {
    const tilt = polyline(5, [
      { x: 360, y: 330 },
      { x: 400, y: 170 },
      { x: 440, y: 330 },
    ]);
    const turnHandleLeft = polyline(6, [
      { x: 450, y: 200 },
      { x: 350, y: 240 },
      { x: 450, y: 280 },
    ]);
    const { cells } = parseSketch([frame, divider, chevron, tilt, turnHandleLeft]);

    expect(cells.map((c) => c.opening)).toEqual([
      { kind: 'recognized', opening: 'turn', hinge: 'left' },
      { kind: 'recognized', opening: 'tilt_turn', hinge: 'right' },
    ]);
  });

  it('puts strokes outside the frame aside, with their side', () => {
    const digit = polyline(7, [
      { x: 280, y: 430 },
      { x: 300, y: 480 },
    ]);
    const { outside } = parseSketch([frame, digit]);

    expect(outside).toMatchObject([{ side: 'below', stroke: { stroke: digit } }]);
  });
});
