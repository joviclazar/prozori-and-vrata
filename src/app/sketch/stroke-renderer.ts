import { Point } from '../../core/geometry/point';

const STROKE_COLOR = '#222';
const STROKE_WIDTH = 2;

const SEGMENT_COLOR = '#d32f2f';
const SEGMENT_WIDTH = 1.5;
const VERTEX_RADIUS = 3;
const LABEL_FONT = '12px sans-serif';
const LABEL_OFFSET = 6;

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

function drawDot(ctx: CanvasRenderingContext2D, p: Point, radius = STROKE_WIDTH / 2): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}
