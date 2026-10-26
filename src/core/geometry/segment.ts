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
    segments.push({ start: vertices[i - 1], end: vertices[i] });
  }

  return segments;
}

export type Orientation = 'horizontal' | 'vertical';

export function segmentLength(segment: Segment): number {
  return distance(segment.start, segment.end);
}

export function segmentOrientation(segment: Segment, maxDeviationDeg: number): Orientation | null {
  const dx = Math.abs(segment.end.x - segment.start.x);
  const dy = Math.abs(segment.end.y - segment.start.y);

  const angleRadians = Math.atan2(dy, dx);
  const angleDegrees = (angleRadians * 180) / Math.PI;

  if (angleDegrees <= maxDeviationDeg) {
    return 'horizontal';
  } else if (90 - angleDegrees <= maxDeviationDeg) {
    return 'vertical';
  } else {
    return null;
  }
}

export function cornerAngle(incoming: Segment, outgoing: Segment): number {
  const ux = incoming.start.x - incoming.end.x;
  const uy = incoming.start.y - incoming.end.y;
  const wx = outgoing.end.x - outgoing.start.x;
  const wy = outgoing.end.y - outgoing.start.y;

  const uLength = Math.abs(segmentLength(incoming));
  const wLength = Math.abs(segmentLength(outgoing));

  if (uLength === 0 || wLength === 0) {
    throw new Error('length of segment is 0');
  }

  const dot = ux * wx + uy * wy;

  const cosRaw = dot / (uLength * wLength);
  const cos = Math.min(1, Math.max(-1, cosRaw));

  return (Math.acos(cos) * 180) / Math.PI;
}
