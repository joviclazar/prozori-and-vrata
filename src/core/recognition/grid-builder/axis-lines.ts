import { Orientation } from '../../geometry/segment';
import { StructuralLine } from '../stroke-classifier/extract-structural-lines';
import { MergeThresholds } from './grid-builder-config';

export interface AxisLine {
  readonly orientation: Orientation;
  readonly position: number;
  readonly start: number;
  readonly end: number;
  readonly strokeIds: readonly number[];
}

export function toAxisLine(line: StructuralLine): AxisLine {
  let result: AxisLine;
  if (line.orientation == 'horizontal') {
    result = {
      orientation: line.orientation,
      position: (line.segment.start.y + line.segment.end.y) / 2,
      start: Math.min(line.segment.start.x, line.segment.end.x),
      end: Math.max(line.segment.start.x, line.segment.end.x),
      strokeIds: [line.strokeId],
    };
    return result;
  } else {
    result = {
      orientation: line.orientation,
      position: (line.segment.start.x + line.segment.end.x) / 2,
      start: Math.min(line.segment.start.y, line.segment.end.y),
      end: Math.max(line.segment.start.y, line.segment.end.y),
      strokeIds: [line.strokeId],
    };
    return result;
  }
}

function canMerge(a: AxisLine, b: AxisLine, maxPositionDiff: number, maxGap: number): boolean {
  if (a.orientation != b.orientation) {
    return false;
  }
  if (Math.abs(a.position - b.position) > maxPositionDiff) {
    return false;
  }

  const gap: number = Math.max(a.start, b.start) - Math.min(a.end, b.end);
  return gap <= maxGap;
}

function merge(a: AxisLine, b: AxisLine): AxisLine {
  const aLength: number = Math.abs(a.end - a.start);
  const bLength: number = Math.abs(b.end - b.start);
  return {
    orientation: a.orientation,
    start: Math.min(a.start, b.start),
    end: Math.max(a.end, b.end),
    position: (a.position * aLength + b.position * bLength) / (aLength + bLength),
    strokeIds: [...a.strokeIds, ...b.strokeIds],
  };
}

export function mergeCollinear(
  lines: readonly AxisLine[],
  thresholds: MergeThresholds,
): AxisLine[] {
  const longest = lines.reduce((max, line) => Math.max(max, line.end - line.start), 0);
  const maxPositionDiff = thresholds.maxPositionDiffRatio * longest;
  const maxGap = thresholds.maxGapRatio * longest;

  let result: AxisLine[] = [...lines];
  let pair = findMergeablePair(result, maxPositionDiff, maxGap);

  while (pair !== null) {
    const [i, j] = pair;
    const merged = merge(result[i], result[j]);
    result = [...result.filter((_, k) => k !== i && k !== j), merged];
    pair = findMergeablePair(result, maxPositionDiff, maxGap);
  }

  return result;
}

function findMergeablePair(
  lines: readonly AxisLine[],
  maxPositionDiff: number,
  maxGap: number,
): [number, number] | null {
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (canMerge(lines[i], lines[j], maxPositionDiff, maxGap)) {
        return [i, j];
      }
    }
  }
  return null;
}
