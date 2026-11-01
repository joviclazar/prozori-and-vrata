import { BoundingBox, boundingBox } from '../../geometry/bounding-box';
import { Point } from '../../geometry/point';
import { Stroke } from '../../model/stroke';
import { SegmentedStroke } from '../segmentation/segment-strokes';
import { GridCell, gridCells, GridNode } from './build-grid-tree';

export type Side = 'above' | 'below' | 'left' | 'right';

export interface CellAnnotations {
  readonly cell: GridCell;
  readonly strokes: readonly SegmentedStroke[];
}

export interface OutsideAnnotation {
  readonly side: Side;
  readonly stroke: SegmentedStroke;
}

export interface PlacedAnnotations {
  readonly cells: readonly CellAnnotations[];
  readonly outside: readonly OutsideAnnotation[];
}

export function placeAnnotations(
  tree: GridNode,
  frame: BoundingBox,
  annotations: readonly SegmentedStroke[],
): PlacedAnnotations {
  const cells = gridCells(tree).map((cell) => ({ cell, strokes: [] as SegmentedStroke[] }));
  const outside: OutsideAnnotation[] = [];

  for (const annotation of annotations) {
    const center = strokeCenter(annotation.stroke);
    const target = cells.find(({ cell }) => contains(cell.bounds, center));
    if (target) {
      target.strokes.push(annotation);
    } else {
      outside.push({ side: sideOf(center, frame), stroke: annotation });
    }
  }

  return { cells, outside };
}

function strokeCenter(stroke: Stroke): Point {
  const box = boundingBox(stroke.points);
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
}

function contains(bounds: BoundingBox, point: Point): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

function sideOf(point: Point, frame: BoundingBox): Side {
  if (point.y > frame.maxY) {
    return 'below';
  }
  if (point.y < frame.minY) {
    return 'above';
  }
  return point.x > frame.maxX ? 'right' : 'left';
}
