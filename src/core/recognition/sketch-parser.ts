import { Stroke } from '../model/stroke';
import { AxisLine, mergeCollinear, toAxisLine } from './grid-builder/axis-lines';
import { buildGridTree, GridCell, GridNode } from './grid-builder/build-grid-tree';
import { findGridLines, GridLines } from './grid-builder/find-grid-lines';
import {
  GRID_THRESHOLDS,
  GridThresholds,
  MERGE_THRESHOLDS,
  MergeThresholds,
} from './grid-builder/grid-builder-config';
import { OutsideAnnotation, placeAnnotations } from './grid-builder/place-annotations';
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
import { Chevron, findChevrons } from './symbol-recognizer/find-chevrons';
import { OpeningResult, recognizeOpening } from './symbol-recognizer/recognize-opening';
import { SYMBOL_THRESHOLDS, SymbolThresholds } from './symbol-recognizer/symbol-config';

export interface SketchParserConfig {
  readonly segmentationTolerancePx: number;
  readonly minStrokeLengthPx: number;
  readonly structuralLines: StructuralLineThresholds;
  readonly merge: MergeThresholds;
  readonly grid: GridThresholds;
  readonly symbols: SymbolThresholds;
}

export const DEFAULT_SKETCH_PARSER_CONFIG: SketchParserConfig = {
  segmentationTolerancePx: SEGMENTATION_TOLERANCE_PX,
  minStrokeLengthPx: MIN_STROKE_LENGTH_PX,
  structuralLines: STRUCTURAL_LINE_THRESHOLDS,
  merge: MERGE_THRESHOLDS,
  grid: GRID_THRESHOLDS,
  symbols: SYMBOL_THRESHOLDS,
};

export interface ParsedCell {
  readonly cell: GridCell;
  readonly strokes: readonly SegmentedStroke[];
  readonly chevrons: readonly Chevron[];
  readonly opening: OpeningResult;
}

export interface ParsedSketch {
  readonly segmented: readonly SegmentedStroke[];
  readonly lines: readonly StructuralLine[];
  readonly annotations: readonly Stroke[];
  readonly axisLines: readonly AxisLine[];
  readonly grid: GridLines | null;
  readonly tree: GridNode | null;
  readonly cells: readonly ParsedCell[];
  readonly outside: readonly OutsideAnnotation[];
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

  if (grid === null || tree === null) {
    return { segmented, lines, annotations, axisLines, grid, tree, cells: [], outside: [] };
  }

  const annotated = new Set<Stroke>(annotations);
  const segmentedAnnotations = segmented.filter((s) => annotated.has(s.stroke));
  const placed = placeAnnotations(tree, grid.frame, segmentedAnnotations);
  const cells = placed.cells.map(({ cell, strokes }) => {
    const chevrons = findChevrons(strokes, config.symbols);
    return { cell, strokes, chevrons, opening: recognizeOpening(chevrons) };
  });

  return { segmented, lines, annotations, axisLines, grid, tree, cells, outside: placed.outside };
}
