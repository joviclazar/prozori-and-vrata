import { BoundingBox } from '../../geometry/bounding-box';
import { Orientation } from '../../geometry/segment';
import { AxisLine } from './axis-lines';
import { GridLines } from './find-grid-lines';

export type GridNode =
  | { readonly kind: 'cell'; readonly bounds: BoundingBox }
  | {
      readonly kind: 'split';
      readonly direction: Orientation;
      readonly bounds: BoundingBox;
      readonly dividers: readonly AxisLine[];
      readonly children: readonly GridNode[];
    };

function crossesRegion(line: AxisLine, bounds: BoundingBox): boolean {
  let insideAcross: boolean;
  let coversAlong: boolean;
  if (line.orientation === 'vertical') {
    insideAcross = bounds.minX < line.position && bounds.maxX > line.position;
    coversAlong = line.start <= bounds.minY && line.end >= bounds.maxY;
  } else {
    insideAcross = bounds.minY < line.position && bounds.maxY > line.position;
    coversAlong = line.start <= bounds.minX && line.end >= bounds.maxX;
  }

  return insideAcross && coversAlong;
}

function cutRegion(
  bounds: BoundingBox,
  direction: Orientation,
  positions: readonly number[],
): BoundingBox[] {
  const start: number = direction === 'vertical' ? bounds.minX : bounds.minY;
  const end: number = direction === 'vertical' ? bounds.maxX : bounds.maxY;
  const dotsCutting: number[] = [start, ...positions, end];

  const regions: BoundingBox[] = [];
  for (let i = 1; i < dotsCutting.length; i++) {
    if (direction === 'vertical') {
      regions.push({
        minX: dotsCutting[i - 1],
        maxX: dotsCutting[i],
        minY: bounds.minY,
        maxY: bounds.maxY,
      });
    } else {
      regions.push({
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: dotsCutting[i - 1],
        maxY: dotsCutting[i],
      });
    }
  }
  return regions;
}

function build(bounds: BoundingBox, dividers: readonly AxisLine[]): GridNode {
  const horizontal: AxisLine[] = dividers.filter(
    (divider) => divider.orientation === 'horizontal' && crossesRegion(divider, bounds),
  );
  const vertical: AxisLine[] = dividers.filter(
    (divider) => divider.orientation === 'vertical' && crossesRegion(divider, bounds),
  );
  let direction: Orientation;
  let sorted: AxisLine[];
  if (horizontal.length !== 0) {
    direction = 'horizontal';
    horizontal.sort((a, b) => a.position - b.position);
    sorted = horizontal;
  } else if (vertical.length !== 0) {
    direction = 'vertical';
    vertical.sort((a, b) => a.position - b.position);
    sorted = vertical;
  } else {
    return { kind: 'cell', bounds: bounds };
  }
  const parts = cutRegion(
    bounds,
    direction,
    sorted.map((d) => d.position),
  );
  return {
    direction: direction,
    bounds: bounds,
    kind: 'split',
    dividers: sorted,
    children: parts.map((part) => build(part, dividers)),
  };
}

export function buildGridTree(grid: GridLines): GridNode {
  return build(grid.frame, grid.dividers);
}
