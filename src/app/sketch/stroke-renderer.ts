import { Point } from '../../core/geometry/point';
import { Segment } from '../../core/geometry/segment';
import { AxisLine } from '../../core/recognition/grid-builder/axis-lines';

const STROKE_COLOR = '#222';
const STROKE_WIDTH = 2;

const SEGMENT_COLOR = '#d32f2f';
const SEGMENT_WIDTH = 1.5;
const VERTEX_RADIUS = 3;
const LABEL_FONT = '12px sans-serif';
const LABEL_OFFSET = 6;

const STRUCTURAL_COLOR = '#1565c0';
const STRUCTURAL_WIDTH = 4;
const ANNOTATION_COLOR = '#9e9e9e';
const ANNOTATION_WIDTH = 3;
const REJECTED_COLOR = '#d32f2f';
const REJECTED_WIDTH = 3;
const AXIS_COLOR = '#2e7d32';
const AXIS_WIDTH = 3;

export function applyStrokeStyle(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = STROKE_COLOR;
  ctx.fillStyle = STROKE_COLOR;
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

export function drawStroke(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  if (points.length === 0) {
    return;
  }
  if (points.length === 1) {
    drawDot(ctx, points[0]);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

export function drawSegment(ctx: CanvasRenderingContext2D, a: Point, b: Point): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

export function drawSimplifiedPath(
  ctx: CanvasRenderingContext2D,
  vertices: readonly Point[],
): void {
  if (vertices.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = SEGMENT_COLOR;
  ctx.fillStyle = SEGMENT_COLOR;
  ctx.lineWidth = SEGMENT_WIDTH;

  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.stroke();

  for (const vertex of vertices) {
    drawDot(ctx, vertex, VERTEX_RADIUS);
  }

  ctx.font = LABEL_FONT;
  ctx.fillText(
    String(vertices.length - 1),
    vertices[0].x + LABEL_OFFSET,
    vertices[0].y - LABEL_OFFSET,
  );
  ctx.restore();
}

export function drawStructuralLine(ctx: CanvasRenderingContext2D, segment: Segment): void {
  drawColoredPath(ctx, [segment.start, segment.end], STRUCTURAL_COLOR, STRUCTURAL_WIDTH);
}

export function drawAnnotation(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  drawColoredPath(ctx, points, ANNOTATION_COLOR, ANNOTATION_WIDTH);
}

export function drawRejected(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  drawColoredPath(ctx, points, REJECTED_COLOR, REJECTED_WIDTH);
}

export function drawAxisLine(ctx: CanvasRenderingContext2D, line: AxisLine): void {
  const from =
    line.orientation === 'horizontal'
      ? { x: line.start, y: line.position }
      : { x: line.position, y: line.start };
  const to =
    line.orientation === 'horizontal'
      ? { x: line.end, y: line.position }
      : { x: line.position, y: line.end };

  drawColoredPath(ctx, [from, to], AXIS_COLOR, AXIS_WIDTH);

  if (line.strokeIds.length > 1) {
    ctx.save();
    ctx.fillStyle = AXIS_COLOR;
    ctx.font = LABEL_FONT;
    ctx.fillText(line.strokeIds.join('+'), from.x + LABEL_OFFSET, from.y - LABEL_OFFSET);
    ctx.restore();
  }
}

function drawColoredPath(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
  width: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (points.length === 1) {
    drawDot(ctx, points[0], width);
  } else {
    drawStroke(ctx, points);
  }
  ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, p: Point, radius = STROKE_WIDTH / 2): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}
