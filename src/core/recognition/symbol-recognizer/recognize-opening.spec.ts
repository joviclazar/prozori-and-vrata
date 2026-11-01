import { describe, expect, it } from 'vitest';
import { ApexDirection, Chevron } from './find-chevrons';
import { recognizeOpening } from './recognize-opening';

function chevrons(...directions: ApexDirection[]): Chevron[] {
  return directions.map((direction) => ({ apex: { x: 0, y: 0 }, direction }));
}

describe('recognizeOpening', () => {
  it('treats a cell without symbols as fixed glass', () => {
    expect(recognizeOpening([])).toEqual({ kind: 'recognized', opening: 'fixed', hinge: null });
  });

  it('turns ">" into a turn sash with hinges on the left', () => {
    expect(recognizeOpening(chevrons('right'))).toEqual({
      kind: 'recognized',
      opening: 'turn',
      hinge: 'left',
    });
  });

  it('turns "<" into a turn sash with hinges on the right', () => {
    expect(recognizeOpening(chevrons('left'))).toEqual({
      kind: 'recognized',
      opening: 'turn',
      hinge: 'right',
    });
  });

  it('turns "Λ" into a tilt sash without side hinges', () => {
    expect(recognizeOpening(chevrons('up'))).toEqual({
      kind: 'recognized',
      opening: 'tilt',
      hinge: null,
    });
  });

  it('combines ">" and "Λ" into a tilt and turn sash, in any order', () => {
    const expected = { kind: 'recognized', opening: 'tilt_turn', hinge: 'left' };

    expect(recognizeOpening(chevrons('right', 'up'))).toEqual(expected);
    expect(recognizeOpening(chevrons('up', 'right'))).toEqual(expected);
  });

  it('combines "<" and "Λ" into a tilt and turn sash with hinges on the right', () => {
    expect(recognizeOpening(chevrons('up', 'left'))).toEqual({
      kind: 'recognized',
      opening: 'tilt_turn',
      hinge: 'right',
    });
  });

  it('ignores a symbol drawn twice', () => {
    expect(recognizeOpening(chevrons('left', 'up', 'left'))).toEqual({
      kind: 'recognized',
      opening: 'tilt_turn',
      hinge: 'right',
    });
  });

  it('does not know a "V"', () => {
    expect(recognizeOpening(chevrons('down'))).toEqual({ kind: 'unknown', directions: ['down'] });
  });

  it('does not know ">" and "<" in the same cell', () => {
    expect(recognizeOpening(chevrons('right', 'up', 'left'))).toEqual({
      kind: 'unknown',
      directions: ['right', 'up', 'left'],
    });
  });

  it('lists each direction of an unknown combination once, in the order found', () => {
    expect(recognizeOpening(chevrons('down', 'up', 'down'))).toEqual({
      kind: 'unknown',
      directions: ['down', 'up'],
    });
  });
});
