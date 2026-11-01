import { describe, expect, it } from 'vitest';
import { hingeSide } from './opening-convention';

describe('hingeSide', () => {
  it('puts the hinges opposite the apex, because the apex points to the handle', () => {
    expect(hingeSide('right')).toBe('left');
    expect(hingeSide('left')).toBe('right');
  });
});
