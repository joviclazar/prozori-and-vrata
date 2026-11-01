import { BoundingBox } from '../../core/geometry/bounding-box';
import { Stroke } from '../../core/model/stroke';
import { AxisLine } from '../../core/recognition/grid-builder/axis-lines';
import { ParsedSketch } from '../../core/recognition/sketch-parser';

export interface BeautifiedSketch {
  readonly frame: BoundingBox | null;
  readonly dividers: readonly AxisLine[];
  readonly handDrawn: readonly Stroke[];
}

export function beautify(strokes: readonly Stroke[], parsed: ParsedSketch): BeautifiedSketch {
  if (parsed.grid === null) {
    return { frame: null, dividers: [], handDrawn: strokes };
  }

  const kept = new Set<Stroke>(parsed.segmented.map((s) => s.stroke));
  const annotated = new Set<Stroke>(parsed.annotations);
  const rejectedIds = new Set<number>(parsed.grid.rejected.flatMap((line) => line.strokeIds));

  const handDrawn = strokes.filter(
    (stroke) => kept.has(stroke) && (annotated.has(stroke) || rejectedIds.has(stroke.id)),
  );

  return { frame: parsed.grid.frame, dividers: parsed.grid.dividers, handDrawn };
}
