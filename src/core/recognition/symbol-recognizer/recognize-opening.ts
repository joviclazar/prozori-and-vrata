import { HingeSide, Opening } from '../../model/window-model';
import { ApexDirection, Chevron } from './find-chevrons';
import { hingeSide } from './opening-convention';

export type OpeningResult =
  | { readonly kind: 'recognized'; readonly opening: Opening; readonly hinge: HingeSide }
  | { readonly kind: 'unknown'; readonly directions: readonly ApexDirection[] };

export function recognizeOpening(chevrons: readonly Chevron[]): OpeningResult {
  const directions = new Set<ApexDirection>(chevrons.map((c) => c.direction));

  if (directions.has('down') || (directions.has('left') && directions.has('right'))) {
    return { kind: 'unknown', directions: [...directions] };
  }

  const side = directions.has('left') ? 'left' : directions.has('right') ? 'right' : null;
  const tilts = directions.has('up');

  if (side !== null) {
    return {
      kind: 'recognized',
      opening: tilts ? 'tilt_turn' : 'turn',
      hinge: hingeSide(side),
    };
  }
  return { kind: 'recognized', opening: tilts ? 'tilt' : 'fixed', hinge: null };
}
