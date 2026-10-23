import { distance, Point } from './point';

export function distanceToSegment(p: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx ** 2 + dy ** 2;
  if (len2 === 0) return distance(p, start);

  const t = Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / len2));
  return distance(p, { x: start.x + t * dx, y: start.y + t * dy });
}

export interface Segment {
  readonly start: Point;
  readonly end: Point;
}

export function toSegments(vertices: readonly Point[]): Segment[] {
  const segments: Segment[] = [];

  for (let i = 1; i < vertices.length; i++) {
    segments.push({start: vertices[i-1], end: vertices[i]});
  }

  return segments;
}