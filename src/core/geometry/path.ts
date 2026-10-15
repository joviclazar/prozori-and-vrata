import { distance, Point } from './point';

export function pathLength(points: readonly Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
}

export function straightness(points: readonly Point[]): number {
  const length: number = pathLength(points);
  if (length === 0) {
    return 0;
  }
  const firstLastPointDistance: number = distance(points[0], points[points.length - 1]);
  return firstLastPointDistance / length;
}
