import { pathLength } from "../../geometry/path";
import { Segment, toSegments } from "../../geometry/segment";
import { simplifyPath } from "../../geometry/simplify-path";
import { Stroke, StrokePoint } from "../../model/stroke";

export interface SegmentedStroke {
  readonly stroke: Stroke;
  readonly segments: readonly Segment[];
}

export function segmentStrokes(strokes: readonly Stroke[], tolerance: number, minLength: number): SegmentedStroke[] {
    const segmentedStrokes: SegmentedStroke[] = [];
    
    for (const stroke of strokes) {
        if (pathLength(stroke.points) < minLength) {
            continue;
        }

        const vertices: StrokePoint[] = simplifyPath(stroke.points, tolerance);
        const segments: Segment[] = toSegments(vertices);

        segmentedStrokes.push({
            stroke: stroke,
            segments: segments,
        })
    }

    return segmentedStrokes;
}