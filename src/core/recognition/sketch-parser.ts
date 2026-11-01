import { Stroke } from '../model/stroke';
import { AxisLine, mergeCollinear, toAxisLine } from './grid-builder/axis-lines';
import { buildGridTree, GridNode } from './grid-builder/build-grid-tree';
import { findGridLines, GridLines } from './grid-builder/find-grid-lines';
import {
  GRID_THRESHOLDS,
  GridThresholds,
  MERGE_THRESHOLDS,
  MergeThresholds,
} from './grid-builder/grid-builder-config';
import { SegmentedStroke, segmentStrokes } from './segmentation/segment-strokes';
import {
  MIN_STROKE_LENGTH_PX,
  SEGMENTATION_TOLERANCE_PX,
} from './segmentation/segmentation-config';
import {
  extractStructuralLines,
  StructuralLine,
} from './stroke-classifier/extract-structural-lines';
import {
  STRUCTURAL_LINE_THRESHOLDS,
  StructuralLineThresholds,
} from './stroke-classifier/structural-lines-config';

export interface SketchParserConfig {
  readonly segmentationTolerancePx: number;
  readonly minStrokeLengthPx: number;
  readonly structuralLines: StructuralLineThresholds;
  readonly merge: MergeThresholds;
  readonly grid: GridThresholds;
}

export const DEFAULT_SKETCH_PARSER_CONFIG: SketchParserConfig = {
  segmentationTolerancePx: SEGMENTATION_TOLERANCE_PX,
  minStrokeLengthPx: MIN_STROKE_LENGTH_PX,
  structuralLines: STRUCTURAL_LINE_THRESHOLDS,
  merge: MERGE_THRESHOLDS,
  grid: GRID_THRESHOLDS,
};

export interface ParsedSketch {
  readonly segmented: readonly SegmentedStroke[];
  readonly lines: readonly StructuralLine[];
  readonly annotations: readonly Stroke[];
  readonly axisLines: readonly AxisLine[];
  readonly grid: GridLines | null;
  readonly tree: GridNode | null;
}

export function parseSketch(
  strokes: readonly Stroke[],
  config: SketchParserConfig = DEFAULT_SKETCH_PARSER_CONFIG,
): ParsedSketch {
  const segmented = segmentStrokes(
    strokes,
    config.segmentationTolerancePx,
    config.minStrokeLengthPx,
  );
  const { lines, annotations } = extractStructuralLines(segmented, config.structuralLines);
  const axisLines = mergeCollinear(lines.map(toAxisLine), config.merge);
  const grid = findGridLines(axisLines, config.grid);
  const tree = grid === null ? null : buildGridTree(grid);

  return { segmented, lines, annotations, axisLines, grid, tree };
}
