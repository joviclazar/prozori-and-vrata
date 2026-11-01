import { describe, expect, it } from 'vitest';
import { BoundingBox } from '../../geometry/bounding-box';
import { Orientation } from '../../geometry/segment';
import { AxisLine } from './axis-lines';
import { buildGridTree, gridCells, GridNode } from './build-grid-tree';
import { GridLines } from './find-grid-lines';

function axis(
  orientation: Orientation,
  position: number,
  start: number,
  end: number,
  doubled = false,
): AxisLine {
  return { orientation, position, start, end, strokeIds: [1], doubled };
}

function box(minX: number, maxX: number, minY: number, maxY: number): BoundingBox {
  return { minX, maxX, minY, maxY };
}

function cell(bounds: BoundingBox): GridNode {
  return { kind: 'cell', bounds };
}

const FRAME = box(100, 500, 100, 400);

function grid(dividers: readonly AxisLine[], frame: BoundingBox = FRAME): GridLines {
  return { frame, dividers, rejected: [] };
}

describe('buildGridTree', () => {
  it('turns a frame without dividers into a single cell', () => {
    expect(buildGridTree(grid([]))).toEqual(cell(FRAME));
  });

  it('splits the frame into two cells side by side with one vertical divider', () => {
    const stulp = axis('vertical', 300, 100, 400);

    expect(buildGridTree(grid([stulp]))).toEqual({
      kind: 'split',
      direction: 'vertical',
      bounds: FRAME,
      dividers: [stulp],
      children: [cell(box(100, 300, 100, 400)), cell(box(300, 500, 100, 400))],
    });
  });

  it('keeps the original divider objects', () => {
    const stulp = axis('vertical', 300, 100, 400);
    const tree = buildGridTree(grid([stulp]));

    expect(tree.kind === 'split' && tree.dividers[0]).toBe(stulp);
  });

  it('orders three cells from left to right, with a mixed T-profile and stulp between them', () => {
    const mullion = axis('vertical', 400, 100, 400, true);
    const stulp = axis('vertical', 200, 100, 400);

    expect(buildGridTree(grid([mullion, stulp]))).toEqual({
      kind: 'split',
      direction: 'vertical',
      bounds: FRAME,
      dividers: [stulp, mullion],
      children: [
        cell(box(100, 200, 100, 400)),
        cell(box(200, 400, 100, 400)),
        cell(box(400, 500, 100, 400)),
      ],
    });
  });

  it('splits the frame into a top and a bottom cell with a horizontal divider', () => {
    const transom = axis('horizontal', 200, 100, 500, true);

    expect(buildGridTree(grid([transom]))).toEqual({
      kind: 'split',
      direction: 'horizontal',
      bounds: FRAME,
      dividers: [transom],
      children: [cell(box(100, 500, 100, 200)), cell(box(100, 500, 200, 400))],
    });
  });

  it('builds a transom light with two sashes below it (T-junction), whatever the input order', () => {
    const belowTransom = axis('vertical', 300, 200, 400);
    const transom = axis('horizontal', 200, 100, 500, true);
    const bottom = box(100, 500, 200, 400);

    const expected: GridNode = {
      kind: 'split',
      direction: 'horizontal',
      bounds: FRAME,
      dividers: [transom],
      children: [
        cell(box(100, 500, 100, 200)),
        {
          kind: 'split',
          direction: 'vertical',
          bounds: bottom,
          dividers: [belowTransom],
          children: [cell(box(100, 300, 200, 400)), cell(box(300, 500, 200, 400))],
        },
      ],
    };

    expect(buildGridTree(grid([belowTransom, transom]))).toEqual(expected);
    expect(buildGridTree(grid([transom, belowTransom]))).toEqual(expected);
  });

  it('splits only one pane when a horizontal divider ends on a vertical one', () => {
    const divider = axis('vertical', 300, 100, 400);
    const leftPaneTransom = axis('horizontal', 250, 100, 300, true);

    expect(buildGridTree(grid([leftPaneTransom, divider]))).toEqual({
      kind: 'split',
      direction: 'vertical',
      bounds: FRAME,
      dividers: [divider],
      children: [
        {
          kind: 'split',
          direction: 'horizontal',
          bounds: box(100, 300, 100, 400),
          dividers: [leftPaneTransom],
          children: [cell(box(100, 300, 100, 250)), cell(box(100, 300, 250, 400))],
        },
        cell(box(300, 500, 100, 400)),
      ],
    });
  });

  it('splits a cross horizontally first, so the vertical divider appears in both halves', () => {
    const vertical = axis('vertical', 300, 100, 400, true);
    const horizontal = axis('horizontal', 250, 100, 500, true);
    const tree = buildGridTree(grid([vertical, horizontal]));

    expect(tree).toEqual({
      kind: 'split',
      direction: 'horizontal',
      bounds: FRAME,
      dividers: [horizontal],
      children: [
        {
          kind: 'split',
          direction: 'vertical',
          bounds: box(100, 500, 100, 250),
          dividers: [vertical],
          children: [cell(box(100, 300, 100, 250)), cell(box(300, 500, 100, 250))],
        },
        {
          kind: 'split',
          direction: 'vertical',
          bounds: box(100, 500, 250, 400),
          dividers: [vertical],
          children: [cell(box(100, 300, 250, 400)), cell(box(300, 500, 250, 400))],
        },
      ],
    });
  });

  it('builds a nested tree: transom light over three panes', () => {
    const transom = axis('horizontal', 180, 100, 500, true);
    const left = axis('vertical', 220, 180, 400, true);
    const right = axis('vertical', 380, 180, 400);
    const tree = buildGridTree(grid([right, transom, left]));

    expect(tree.kind).toBe('split');
    if (tree.kind !== 'split') return;
    expect(tree.direction).toBe('horizontal');
    expect(tree.children[0]).toEqual(cell(box(100, 500, 100, 180)));

    const bottom = tree.children[1];
    expect(bottom.kind === 'split' && bottom.direction).toBe('vertical');
    expect(bottom.kind === 'split' && bottom.dividers).toEqual([left, right]);
    expect(bottom.kind === 'split' && bottom.children).toEqual([
      cell(box(100, 220, 180, 400)),
      cell(box(220, 380, 180, 400)),
      cell(box(380, 500, 180, 400)),
    ]);
  });

  it('builds the tree of a recorded sketch with a T-profile', () => {
    const frame = box(540, 997, 196, 437);
    const mullion = axis('vertical', 748, 196, 437, true);

    expect(buildGridTree(grid([mullion], frame))).toEqual({
      kind: 'split',
      direction: 'vertical',
      bounds: frame,
      dividers: [mullion],
      children: [cell(box(540, 748, 196, 437)), cell(box(748, 997, 196, 437))],
    });
  });

  it('does not change its input', () => {
    const transom = axis('horizontal', 200, 100, 500, true);
    const belowTransom = axis('vertical', 300, 200, 400);
    const input = grid([belowTransom, transom]);
    const copy = structuredClone(input);

    buildGridTree(input);

    expect(input).toEqual(copy);
  });
});

describe('gridCells', () => {
  it('returns the tree itself when it is a single cell', () => {
    const tree = buildGridTree(grid([]));
    expect(gridCells(tree)).toEqual([tree]);
  });

  it('returns the cells left to right and top to bottom, as the original node objects', () => {
    const transom = axis('horizontal', 200, 100, 500, true);
    const belowTransom = axis('vertical', 300, 200, 400);
    const tree = buildGridTree(grid([belowTransom, transom]));
    const cells = gridCells(tree);

    expect(cells.map((c) => c.bounds)).toEqual([
      box(100, 500, 100, 200),
      box(100, 300, 200, 400),
      box(300, 500, 200, 400),
    ]);
    expect(tree.kind === 'split' && cells[0]).toBe(tree.kind === 'split' && tree.children[0]);
  });
});
