import { Point } from '../geometry/point';

export interface StrokePoint extends Point {
  readonly time: number;
  readonly pressure?: number;
}

export const POINTER_TYPES = ['mouse', 'pen', 'touch'] as const;
export type PointerType = (typeof POINTER_TYPES)[number];

export interface Stroke {
  readonly id: number;
  readonly pointerType: PointerType;
  readonly points: readonly StrokePoint[];
}
