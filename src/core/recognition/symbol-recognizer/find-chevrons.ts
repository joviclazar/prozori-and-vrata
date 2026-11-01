import { distance, Point } from '../../geometry/point';
import { cornerAngle, Segment, segmentLength } from '../../geometry/segment';
import { SegmentedStroke } from '../segmentation/segment-strokes';
import { SymbolThresholds } from './symbol-config';

export type ApexDirection = 'left' | 'right' | 'up' | 'down';

export interface Chevron {
  readonly apex: Point;
  readonly direction: ApexDirection;
  readonly strokeIds: readonly number[];
}

interface EndPairing {
  readonly nearA: Point;
  readonly nearB: Point;
  readonly farA: Point;
  readonly farB: Point;
}

export function apexDirection(apex: Point, endA: Point, endB: Point): ApexDirection {
  const dx = apex.x - (endA.x + endB.x) / 2;
  const dy = apex.y - (endA.y + endB.y) / 2;
  const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;

  if (Math.abs(angle) <= 45) {
    return 'right';
  }
  if (Math.abs(angle) >= 135) {
    return 'left';
  }
  return angle > 0 ? 'up' : 'down';
}

export function findChevrons(
  strokes: readonly SegmentedStroke[],
  thresholds: SymbolThresholds,
): Chevron[] {
  const inStrokes = strokes.flatMap((s) => chevronsInStroke(s, thresholds));
  const singles = strokes.filter((s) => s.segments.length === 1);
  return [...inStrokes, ...joinedChevrons(singles, thresholds)];
}

function chevronFromArms(
  endA: Point,
  apex: Point,
  endB: Point,
  strokeIds: readonly number[],
  thresholds: SymbolThresholds,
): Chevron | null {
  const armA: Segment = { start: endA, end: apex };
  const armB: Segment = { start: apex, end: endB };
  const lengthA = segmentLength(armA);
  const lengthB = segmentLength(armB);
  if (lengthA === 0 || lengthB === 0) {
    return null;
  }

  const comparable =
    Math.min(lengthA, lengthB) / Math.max(lengthA, lengthB) >= thresholds.minArmRatio;
  if (!comparable || cornerAngle(armA, armB) >= thresholds.maxCornerDeg) {
    return null;
  }

  return { apex, direction: apexDirection(apex, endA, endB), strokeIds };
}

function chevronsInStroke(stroke: SegmentedStroke, thresholds: SymbolThresholds): Chevron[] {
  const { segments } = stroke;
  const chevrons: Chevron[] = [];
  for (let i = 1; i < segments.length; i++) {
    const chevron = chevronFromArms(
      segments[i - 1].start,
      segments[i].start,
      segments[i].end,
      [stroke.stroke.id],
      thresholds,
    );
    if (chevron !== null) {
      chevrons.push(chevron);
    }
  }
  return chevrons;
}

function joinedChevrons(
  singles: readonly SegmentedStroke[],
  thresholds: SymbolThresholds,
): Chevron[] {
  const chevrons: Chevron[] = [];
  const used = new Set<number>();

  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      if (used.has(i) || used.has(j)) {
        continue;
      }

      const a = singles[i].segments[0];
      const b = singles[j].segments[0];
      const { nearA, nearB, farA, farB } = closestEnds(a, b);
      const shorter = Math.min(segmentLength(a), segmentLength(b));
      if (distance(nearA, nearB) > thresholds.maxJoinGapRatio * shorter) {
        continue;
      }

      const apex = { x: (nearA.x + nearB.x) / 2, y: (nearA.y + nearB.y) / 2 };
      const strokeIds = [singles[i].stroke.id, singles[j].stroke.id];
      const chevron = chevronFromArms(farA, apex, farB, strokeIds, thresholds);
      if (chevron !== null) {
        chevrons.push(chevron);
        used.add(i);
        used.add(j);
      }
    }
  }

  return chevrons;
}

function closestEnds(a: Segment, b: Segment): EndPairing {
  const pairings: EndPairing[] = [
    { nearA: a.start, nearB: b.start, farA: a.end, farB: b.end },
    { nearA: a.start, nearB: b.end, farA: a.end, farB: b.start },
    { nearA: a.end, nearB: b.start, farA: a.start, farB: b.end },
    { nearA: a.end, nearB: b.end, farA: a.start, farB: b.start },
  ];

  return pairings.reduce((best, pairing) =>
    distance(pairing.nearA, pairing.nearB) < distance(best.nearA, best.nearB) ? pairing : best,
  );
}
