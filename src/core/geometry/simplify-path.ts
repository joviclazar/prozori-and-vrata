import { Point } from "./point";
import { distanceToSegment } from "./segment";

export function simplifyPath<T extends Point>(points: readonly T[], tolerance: number): T[] {
    if (tolerance < 0) {
        throw new Error('negative tolerance value');
    }

    if (points.length <= 2) {
        return [...points];
    }

    const first = points[0];
    const last = points[points.length-1];

    let maxDistance = -1;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
        const distance = distanceToSegment(points[i], first, last);
        if (distance > maxDistance) {
            maxDistance = distance;
            index = i;
        }
    }

    if (maxDistance <= tolerance) {
        return [first, last];
    }

    const left = simplifyPath(points.slice(0, index+1), tolerance);
    const right = simplifyPath(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
}