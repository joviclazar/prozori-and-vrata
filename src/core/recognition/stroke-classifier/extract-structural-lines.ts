import {
  cornerAngle,
  Orientation,
  Segment,
  segmentLength,
  segmentOrientation,
} from '../../geometry/segment';
import { Stroke } from '../../model/stroke';
import { SegmentedStroke } from '../segmentation/segment-strokes';
import { StructuralLineThresholds } from './structural-lines-config';

export interface StructuralLine {
  readonly segment: Segment;
  readonly orientation: Orientation;
  readonly strokeId: number;
}

export interface StructuralExtraction {
  readonly lines: readonly StructuralLine[];
  readonly annotations: readonly Stroke[];
}

export function extractStructuralLines(
  segmented: readonly SegmentedStroke[],
  thresholds: StructuralLineThresholds,
): StructuralExtraction {
  const minLength = thresholds.minLengthRatio * longestSegmentLength(segmented);
  const lines: StructuralLine[] = [];
  const annotations: Stroke[] = [];

  for (const { stroke, segments } of segmented) {
    if (hasSharpCorner(segments, thresholds)) {
      annotations.push(stroke);
      continue;
    }

    const linesBefore = lines.length;

    for (const segment of segments) {
      if (segmentLength(segment) < minLength) {
        continue;
      }

      const orientation = segmentOrientation(segment, thresholds.maxAxisDeviationDeg);
      if (orientation === null) {
        continue;
      }

      lines.push({ segment, orientation, strokeId: stroke.id });
    }

    if (lines.length === linesBefore) {
      annotations.push(stroke);
    }
  }

  return { lines, annotations };
}

function longestSegmentLength(segmented: readonly SegmentedStroke[]): number {
  let longest = 0;
  for (const { segments } of segmented) {
    for (const segment of segments) {
      longest = Math.max(longest, segmentLength(segment));
    }
  }
  return longest;
}

function hasSharpCorner(
  segments: readonly Segment[],
  thresholds: StructuralLineThresholds,
): boolean {
  for (let i = 1; i < segments.length; i++) {
    const incoming = segments[i - 1];
    const outgoing = segments[i];

    const a = segmentLength(incoming);
    const b = segmentLength(outgoing);
    if (Math.min(a, b) / Math.max(a, b) < thresholds.minArmRatio) {
      continue;
    }

    if (cornerAngle(incoming, outgoing) < thresholds.sharpCornerDeg) {
      return true;
    }
  }
  return false;
}
