import { Point } from '../../core/geometry/point';

const STROKE_COLOR = '#222';
const STROKE_WIDTH = 2;

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

function drawDot(ctx: CanvasRenderingContext2D, p: Point): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
  ctx.fill();
}
