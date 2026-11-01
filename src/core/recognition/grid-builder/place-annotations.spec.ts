import { describe, expect, it } from 'vitest';
import { BoundingBox } from '../../geometry/bounding-box';
import { Point } from '../../geometry/point';
import { toSegments } from '../../geometry/segment';
import { Stroke } from '../../model/stroke';
import { SegmentedStroke } from '../segmentation/segment-strokes';
import { AxisLine } from './axis-lines';
import { buildGridTree, gridCells } from './build-grid-tree';
import { placeAnnotations } from './place-annotations';

const FRAME: BoundingBox = { minX: 100, maxX: 500, minY: 100, maxY: 400 };
const DIVIDER: AxisLine = {
  orientation: 'vertical',
  position: 300,
  start: 100,
  end: 400,
  strokeIds: [1],
  doubled: false,
};

const twoCells = buildGridTree({ frame: FRAME, dividers: [DIVIDER], rejected: [] });
const oneCell = buildGridTree({ frame: FRAME, dividers: [], rejected: [] });

function segmented(id: number, vertices: readonly Point[]): SegmentedStroke {
  const stroke: Stroke = {
    id,
    pointerType: 'mouse',
    points: vertices.map((p, i) => ({ x: p.x, y: p.y, time: i * 10 })),
  };
  return { stroke, segments: toSegments(stroke.points) };
}

function chevronAt(id: number, x: number, y: number): SegmentedStroke {
  return segmented(id, [
    { x: x - 40, y: y - 30 },
    { x: x + 40, y },
    { x: x - 40, y: y + 30 },
  ]);
}

describe('placeAnnotations', () => {
  it('returns every cell, also the empty ones, and nothing outside for no annotations', () => {
    const [left, right] = gridCells(twoCells);

    expect(placeAnnotations(twoCells, FRAME, [])).toEqual({
      cells: [
        { cell: left, strokes: [] },
        { cell: right, strokes: [] },
      ],
      outside: [],
    });
  });

  it('refers to the cell node objects of the tree', () => {
    const { cells } = placeAnnotations(twoCells, FRAME, []);
    const [left, right] = gridCells(twoCells);

    expect(cells[0].cell).toBe(left);
    expect(cells[1].cell).toBe(right);
  });

  it('puts a symbol into the cell that contains its center', () => {
    const symbol = chevronAt(5, 400, 250);
    const { cells } = placeAnnotations(twoCells, FRAME, [symbol]);

    expect(cells[0].strokes).toEqual([]);
    expect(cells[1].strokes).toEqual([symbol]);
  });

  it('keeps the input order of the strokes within a cell', () => {
    const turn = chevronAt(5, 200, 250);
    const tilt = segmented(6, [
      { x: 170, y: 330 },
      { x: 200, y: 170 },
      { x: 230, y: 330 },
    ]);
    const { cells } = placeAnnotations(twoCells, FRAME, [tilt, turn]);

    expect(cells[0].strokes).toEqual([tilt, turn]);
  });

  it('decides by the center even when the stroke reaches over a divider', () => {
    const wide = segmented(5, [
      { x: 230, y: 220 },
      { x: 320, y: 250 },
      { x: 230, y: 280 },
    ]);
    const { cells } = placeAnnotations(twoCells, FRAME, [wide]);

    expect(cells[0].strokes).toEqual([wide]);
  });

  it('puts a stroke whose center lies exactly on a divider into the first cell', () => {
    const onDivider = segmented(5, [
      { x: 280, y: 250 },
      { x: 320, y: 250 },
    ]);
    const { cells } = placeAnnotations(twoCells, FRAME, [onDivider]);

    expect(cells[0].strokes).toEqual([onDivider]);
    expect(cells[1].strokes).toEqual([]);
  });

  it('puts strokes outside the frame on the side where their center lies', () => {
    const below = segmented(7, [
      { x: 280, y: 430 },
      { x: 300, y: 470 },
    ]);
    const above = segmented(8, [
      { x: 280, y: 40 },
      { x: 300, y: 80 },
    ]);
    const right = segmented(9, [
      { x: 530, y: 240 },
      { x: 560, y: 260 },
    ]);
    const left = segmented(10, [
      { x: 40, y: 240 },
      { x: 70, y: 260 },
    ]);
    const { cells, outside } = placeAnnotations(twoCells, FRAME, [below, above, right, left]);

    expect(cells.every((c) => c.strokes.length === 0)).toBe(true);
    expect(outside).toEqual([
      { side: 'below', stroke: below },
      { side: 'above', stroke: above },
      { side: 'right', stroke: right },
      { side: 'left', stroke: left },
    ]);
  });

  it('counts a stroke beside a corner as below or above the frame', () => {
    const belowRight = segmented(7, [
      { x: 520, y: 420 },
      { x: 560, y: 460 },
    ]);
    const aboveLeft = segmented(8, [
      { x: 40, y: 40 },
      { x: 80, y: 80 },
    ]);

    expect(placeAnnotations(twoCells, FRAME, [belowRight, aboveLeft]).outside).toEqual([
      { side: 'below', stroke: belowRight },
      { side: 'above', stroke: aboveLeft },
    ]);
  });

  it('works for a frame without dividers', () => {
    const symbol = chevronAt(5, 300, 250);
    const { cells } = placeAnnotations(oneCell, FRAME, [symbol]);

    expect(cells).toEqual([{ cell: oneCell, strokes: [symbol] }]);
  });
});
