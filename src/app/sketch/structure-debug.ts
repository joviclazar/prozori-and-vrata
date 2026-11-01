import { BoundingBox } from '../../core/geometry/bounding-box';
import { Point } from '../../core/geometry/point';
import { Segment } from '../../core/geometry/segment';
import { Stroke } from '../../core/model/stroke';
import { AxisLine } from '../../core/recognition/grid-builder/axis-lines';
import { GridLines } from '../../core/recognition/grid-builder/find-grid-lines';
import { DEFAULT_SKETCH_PARSER_CONFIG, parseSketch } from '../../core/recognition/sketch-parser';
import { OpeningResult } from '../../core/recognition/symbol-recognizer/recognize-opening';
import { StructuralLine } from '../../core/recognition/stroke-classifier/extract-structural-lines';

export interface StructureDebugView {
  readonly lines: readonly StructuralLine[];
  readonly annotations: readonly Stroke[];
  readonly rejected: readonly (readonly Point[])[];
  readonly axisLines: readonly AxisLine[];
  readonly grid: GridLines | null;
  readonly cells: readonly DebugCell[];
}

export interface DebugCell {
  readonly bounds: BoundingBox;
  readonly label: string;
}

export function structureDebugView(
  strokes: readonly Stroke[],
  tolerance: number,
): StructureDebugView {
  const {
    segmented,
    lines,
    annotations,
    axisLines,
    grid,
    cells: parsedCells,
  } = parseSketch(strokes, {
    ...DEFAULT_SKETCH_PARSER_CONFIG,
    segmentationTolerancePx: tolerance,
  });

  const kept = new Set<Stroke>(segmented.map((s) => s.stroke));
  const annotated = new Set<Stroke>(annotations);
  const used = new Set<Segment>(lines.map((l) => l.segment));

  const noise = strokes.filter((stroke) => !kept.has(stroke)).map((stroke) => stroke.points);
  const leftovers = segmented
    .filter((s) => !annotated.has(s.stroke))
    .flatMap((s) => s.segments.filter((segment) => !used.has(segment)))
    .map((segment) => [segment.start, segment.end]);

  const cells = parsedCells.map(({ cell, opening }, index) => ({
    bounds: cell.bounds,
    label: `${index + 1}: ${openingLabel(opening)}`,
  }));

  return { lines, annotations, rejected: [...noise, ...leftovers], axisLines, grid, cells };
}

function openingLabel(result: OpeningResult): string {
  if (result.kind === 'unknown') {
    return `? (${result.directions.join(', ')})`;
  }
  return result.hinge === null ? result.opening : `${result.opening}, hinge ${result.hinge}`;
}
