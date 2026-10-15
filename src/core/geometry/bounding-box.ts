import { Point } from './point';

export interface BoundingBox {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export function boundingBox(points: readonly Point[]): BoundingBox {
  if (points.length === 0) {
    throw new Error('boundingBox: points must not be empty');
  }

  let minX: number = points[0].x;
  let maxX: number = points[0].x;
  let minY: number = points[0].y;
  let maxY: number = points[0].y;

  for (const p of points) {
    if (p.x < minX) {
      minX = p.x;
    } else if (p.x > maxX) {
      maxX = p.x;
    }
    if (p.y < minY) {
      minY = p.y;
    } else if (p.y > maxY) {
      maxY = p.y;
    }
  }

  const box: BoundingBox = {
    minX: minX,
    maxX: maxX,
    minY: minY,
    maxY: maxY,
  };

  return box;
}
