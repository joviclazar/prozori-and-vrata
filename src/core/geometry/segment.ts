import { distance, Point } from './point';

export function distanceToSegment(p: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx ** 2 + dy ** 2;
  if (len2 === 0) return distance(p, start);

  const t = Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / len2));
  return distance(p, { x: start.x + t * dx, y: start.y + t * dy });
}
