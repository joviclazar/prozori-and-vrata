import { BoundingBox } from '../../core/geometry/bounding-box';
import { Point } from '../../core/geometry/point';
import { Segment } from '../../core/geometry/segment';
import { Stroke } from '../../core/model/stroke';
import { segmentStrokes } from '../../core/recognition/segmentation/segment-strokes';
import {
  AxisLine,
  mergeCollinear,
  toAxisLine,
} from '../../core/recognition/grid-builder/axis-lines';
import { buildGridTree, GridNode } from '../../core/recognition/grid-builder/build-grid-tree';
import { findGridLines, GridLines } from '../../core/recognition/grid-builder/find-grid-lines';
import {
  GRID_THRESHOLDS,
  MERGE_THRESHOLDS,
} from '../../core/recognition/grid-builder/grid-builder-config';
import { MIN_STROKE_LENGTH_PX } from '../../core/recognition/segmentation/segmentation-config';
import {
  extractStructuralLines,
  StructuralLine,
} from '../../core/recognition/stroke-classifier/extract-structural-lines';
import { STRUCTURAL_LINE_THRESHOLDS } from '../../core/recognition/stroke-classifier/structural-lines-config';

export interface StructureDebugView {
  readonly lines: readonly StructuralLine[];
  readonly annotations: readonly Stroke[];
  readonly rejected: readonly (readonly Point[])[];
  readonly axisLines: readonly AxisLine[];
  readonly grid: GridLines | null;
  readonly cells: readonly BoundingBox[];
}

export function structureDebugView(
  strokes: readonly Stroke[],
  tolerance: number,
): StructureDebugView {
  const segmented = segmentStrokes(strokes, tolerance, MIN_STROKE_LENGTH_PX);
  const { lines, annotations } = extractStructuralLines(segmented, STRUCTURAL_LINE_THRESHOLDS);

  const kept = new Set<Stroke>(segmented.map((s) => s.stroke));
  const annotated = new Set<Stroke>(annotations);
  const used = new Set<Segment>(lines.map((l) => l.segment));

  const noise = strokes.filter((stroke) => !kept.has(stroke)).map((stroke) => stroke.points);
  const leftovers = segmented
    .filter((s) => !annotated.has(s.stroke))
    .flatMap((s) => s.segments.filter((segment) => !used.has(segment)))
    .map((segment) => [segment.start, segment.end]);

  const axisLines = mergeCollinear(lines.map(toAxisLine), MERGE_THRESHOLDS);

  const grid = findGridLines(axisLines, GRID_THRESHOLDS);
  const cells = grid ? collectCells(buildGridTree(grid)) : [];

  return { lines, annotations, rejected: [...noise, ...leftovers], axisLines, grid, cells };
}

function collectCells(node: GridNode): BoundingBox[] {
  return node.kind === 'cell' ? [node.bounds] : node.children.flatMap(collectCells);
}
