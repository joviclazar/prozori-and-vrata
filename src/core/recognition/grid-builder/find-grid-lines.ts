import { BoundingBox } from '../../geometry/bounding-box';
import { AxisLine } from './axis-lines';
import { GridThresholds } from './grid-builder-config';

export interface FoundFrame {
  readonly frame: BoundingBox;
  readonly inner: readonly AxisLine[];
}

export interface FoundDividers {
  readonly dividers: readonly AxisLine[];
  readonly rejected: readonly AxisLine[];
}

export interface GridLines {
  readonly frame: BoundingBox;
  readonly dividers: readonly AxisLine[];
  readonly rejected: readonly AxisLine[];
}

export function findFrame(lines: readonly AxisLine[], minSideCoverage: number): FoundFrame | null {
  let verticals: AxisLine[] = lines.filter((line) => line.orientation == 'vertical');
  let horizontals: AxisLine[] = lines.filter((line) => line.orientation == 'horizontal');
  if (verticals.length < 2 || horizontals.length < 2) {
    return null;
  }

  verticals = [...verticals].sort((a, b) => a.position - b.position);
  horizontals = [...horizontals].sort((a, b) => a.position - b.position);

  const left: AxisLine = verticals[0];
  const right: AxisLine = verticals[verticals.length - 1];

  const top: AxisLine = horizontals[0];
  const bottom: AxisLine = horizontals[horizontals.length - 1];

  const frame: BoundingBox = {
    minX: left.position,
    maxX: right.position,
    minY: top.position,
    maxY: bottom.position,
  };

  if (
    coverage(top, frame.minX, frame.maxX) < minSideCoverage ||
    coverage(bottom, frame.minX, frame.maxX) < minSideCoverage ||
    coverage(left, frame.minY, frame.maxY) < minSideCoverage ||
    coverage(right, frame.minY, frame.maxY) < minSideCoverage
  ) {
    return null;
  }

  const inner: AxisLine[] = lines.filter(
    (line) => line !== left && line !== right && line !== top && line !== bottom,
  );
  return {
    frame: frame,
    inner: inner,
  };
}

function coverage(line: AxisLine, lo: number, hi: number): number {
  const inside = Math.max(0, Math.min(line.end, hi) - Math.max(line.start, lo));
  return inside / (hi - lo);
}

export function findDividers(
  inner: readonly AxisLine[],
  frame: BoundingBox,
  maxEndGapRatio: number,
): FoundDividers {
  const boundaries: AxisLine[] = frameSides(frame);
  const dividers: AxisLine[] = [];
  let candidates: AxisLine[] = [...inner];

  let found = findSnappable(candidates, boundaries, frame, maxEndGapRatio);
  while (found !== null) {
    const { index, snapped } = found;
    dividers.push(snapped);
    boundaries.push(snapped);
    candidates = candidates.filter((_, k) => k !== index);
    found = findSnappable(candidates, boundaries, frame, maxEndGapRatio);
  }

  return { dividers, rejected: candidates };
}

function frameSides(frame: BoundingBox): AxisLine[] {
  return [
    {
      orientation: 'vertical',
      position: frame.minX,
      start: frame.minY,
      end: frame.maxY,
      strokeIds: [],
      doubled: false,
    },
    {
      orientation: 'vertical',
      position: frame.maxX,
      start: frame.minY,
      end: frame.maxY,
      strokeIds: [],
      doubled: false,
    },
    {
      orientation: 'horizontal',
      position: frame.minY,
      start: frame.minX,
      end: frame.maxX,
      strokeIds: [],
      doubled: false,
    },
    {
      orientation: 'horizontal',
      position: frame.maxY,
      start: frame.minX,
      end: frame.maxX,
      strokeIds: [],
      doubled: false,
    },
  ];
}

function findSnappable(
  candidates: readonly AxisLine[],
  boundaries: readonly AxisLine[],
  frame: BoundingBox,
  maxEndGapRatio: number,
): { index: number; snapped: AxisLine } | null {
  for (let index = 0; index < candidates.length; index++) {
    const snapped = trySnap(candidates[index], boundaries, frame, maxEndGapRatio);
    if (snapped !== null) {
      return { index, snapped };
    }
  }
  return null;
}

function trySnap(
  line: AxisLine,
  boundaries: readonly AxisLine[],
  frame: BoundingBox,
  maxEndGapRatio: number,
): AxisLine | null {
  const size = line.orientation === 'vertical' ? frame.maxY - frame.minY : frame.maxX - frame.minX;
  const maxGap = maxEndGapRatio * size;

  const start = snapEnd(line.start, line, boundaries, maxGap);
  const end = snapEnd(line.end, line, boundaries, maxGap);
  if (start === null || end === null || start >= end) {
    return null;
  }

  return { ...line, start, end };
}

function snapEnd(
  value: number,
  line: AxisLine,
  boundaries: readonly AxisLine[],
  maxGap: number,
): number | null {
  let nearest: number | null = null;
  let nearestGap = Infinity;

  for (const boundary of boundaries) {
    if (boundary.orientation === line.orientation) {
      continue;
    }
    if (line.position < boundary.start || line.position > boundary.end) {
      continue;
    }

    const gap = Math.abs(value - boundary.position);
    if (gap <= maxGap && gap < nearestGap) {
      nearest = boundary.position;
      nearestGap = gap;
    }
  }

  return nearest;
}

export function findGridLines(
  lines: readonly AxisLine[],
  thresholds: GridThresholds,
): GridLines | null {
  const found: FoundFrame | null = findFrame(lines, thresholds.minSideCoverage);
  if (found === null) {
    return null;
  }
  const { dividers, rejected } = findDividers(found.inner, found.frame, thresholds.maxEndGapRatio);
  return { frame: found.frame, dividers, rejected };
}
