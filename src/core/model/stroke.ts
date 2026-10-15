import { Point } from '../geometry/point';

export interface StrokePoint extends Point {
  readonly time: number;
  readonly pressure?: number;
}

export type PointerType = 'mouse' | 'pen' | 'touch';

export interface Stroke {
  readonly id: number;
  readonly pointerType: PointerType;
  readonly points: readonly StrokePoint[];
}
