import { BoundingBox } from '../../core/geometry/bounding-box';
import { HingeSide, Opening } from '../../core/model/window-model';
import { Stroke } from '../../core/model/stroke';
import { AxisLine } from '../../core/recognition/grid-builder/axis-lines';
import { ParsedSketch } from '../../core/recognition/sketch-parser';

export interface OpeningSymbol {
  readonly bounds: BoundingBox;
  readonly opening: Opening;
  readonly hinge: HingeSide;
}

export interface BeautifiedSketch {
  readonly frame: BoundingBox | null;
  readonly dividers: readonly AxisLine[];
  readonly symbols: readonly OpeningSymbol[];
  readonly handDrawn: readonly Stroke[];
}

export function beautify(strokes: readonly Stroke[], parsed: ParsedSketch): BeautifiedSketch {
  if (parsed.grid === null) {
    return { frame: null, dividers: [], symbols: [], handDrawn: strokes };
  }

  const symbols: OpeningSymbol[] = [];
  const symbolIds = new Set<number>();
  for (const { cell, chevrons, opening } of parsed.cells) {
    if (opening.kind !== 'recognized') {
      continue;
    }
    chevrons.forEach((chevron) => chevron.strokeIds.forEach((id) => symbolIds.add(id)));
    if (opening.opening !== 'fixed') {
      symbols.push({ bounds: cell.bounds, opening: opening.opening, hinge: opening.hinge });
    }
  }

  const kept = new Set<Stroke>(parsed.segmented.map((s) => s.stroke));
  const annotated = new Set<Stroke>(parsed.annotations);
  const rejectedIds = new Set<number>(parsed.grid.rejected.flatMap((line) => line.strokeIds));

  const handDrawn = strokes.filter(
    (stroke) =>
      kept.has(stroke) &&
      !symbolIds.has(stroke.id) &&
      (annotated.has(stroke) || rejectedIds.has(stroke.id)),
  );

  return { frame: parsed.grid.frame, dividers: parsed.grid.dividers, symbols, handDrawn };
}
