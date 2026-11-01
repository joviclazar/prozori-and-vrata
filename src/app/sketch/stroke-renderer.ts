import { Point } from '../../core/geometry/point';
import { BoundingBox } from '../../core/geometry/bounding-box';
import { Segment } from '../../core/geometry/segment';
import { HingeSide, Opening } from '../../core/model/window-model';
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
const GRID_COLOR = '#6a1b9a';
const GRID_WIDTH = 3;
const DOUBLE_LINE_OFFSET = 4;
const BEAUTIFIED_COLOR = '#222';
const BEAUTIFIED_WIDTH = 2.5;
const SYMBOL_COLOR = '#555';
const SYMBOL_WIDTH = 1.5;
const SYMBOL_INSET = 8;
const SYMBOL_MAX_INSET_RATIO = 0.1;
const CELL_COLORS = [
  'rgba(30, 136, 229, 0.18)',
  'rgba(67, 160, 71, 0.18)',
  'rgba(251, 140, 0, 0.18)',
  'rgba(142, 36, 170, 0.18)',
  'rgba(0, 172, 193, 0.18)',
  'rgba(229, 57, 53, 0.18)',
];
const CELL_LABEL_COLOR = '#333';
const CELL_LABEL_FONT = 'bold 16px sans-serif';

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
  const [from, to] = axisLineEnds(line, line.position);

  drawColoredPath(ctx, [from, to], AXIS_COLOR, AXIS_WIDTH);

  if (line.strokeIds.length > 1) {
    ctx.save();
    ctx.fillStyle = AXIS_COLOR;
    ctx.font = LABEL_FONT;
    ctx.fillText(line.strokeIds.join('+'), from.x + LABEL_OFFSET, from.y - LABEL_OFFSET);
    ctx.restore();
  }
}

export function drawFrame(ctx: CanvasRenderingContext2D, frame: BoundingBox): void {
  drawFrameWith(ctx, frame, GRID_COLOR, GRID_WIDTH);
}

export function drawDivider(ctx: CanvasRenderingContext2D, line: AxisLine): void {
  drawDividerWith(ctx, line, GRID_COLOR, GRID_WIDTH);
}

export function drawBeautifiedFrame(ctx: CanvasRenderingContext2D, frame: BoundingBox): void {
  drawFrameWith(ctx, frame, BEAUTIFIED_COLOR, BEAUTIFIED_WIDTH);
}

export function drawBeautifiedDivider(ctx: CanvasRenderingContext2D, line: AxisLine): void {
  drawDividerWith(ctx, line, BEAUTIFIED_COLOR, BEAUTIFIED_WIDTH);
}

export function drawOpeningSymbol(
  ctx: CanvasRenderingContext2D,
  bounds: BoundingBox,
  opening: Opening,
  hinge: HingeSide,
): void {
  const inset = Math.min(
    SYMBOL_INSET,
    SYMBOL_MAX_INSET_RATIO * Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY),
  );
  const left = bounds.minX + inset;
  const right = bounds.maxX - inset;
  const top = bounds.minY + inset;
  const bottom = bounds.maxY - inset;
  const middleX = (left + right) / 2;
  const middleY = (top + bottom) / 2;

  const turns = opening === 'turn' || opening === 'tilt_turn';
  const tilts = opening === 'tilt' || opening === 'tilt_turn';

  if (turns && hinge === 'left') {
    drawSymbolLines(ctx, { x: left, y: top }, { x: right, y: middleY }, { x: left, y: bottom });
  }
  if (turns && hinge === 'right') {
    drawSymbolLines(ctx, { x: right, y: top }, { x: left, y: middleY }, { x: right, y: bottom });
  }
  if (tilts) {
    drawSymbolLines(ctx, { x: left, y: bottom }, { x: middleX, y: top }, { x: right, y: bottom });
  }
}

function drawSymbolLines(ctx: CanvasRenderingContext2D, from: Point, apex: Point, to: Point): void {
  drawColoredPath(ctx, [from, apex, to], SYMBOL_COLOR, SYMBOL_WIDTH);
}

function drawFrameWith(
  ctx: CanvasRenderingContext2D,
  frame: BoundingBox,
  color: string,
  width: number,
): void {
  const corners = [
    { x: frame.minX, y: frame.minY },
    { x: frame.maxX, y: frame.minY },
    { x: frame.maxX, y: frame.maxY },
    { x: frame.minX, y: frame.maxY },
    { x: frame.minX, y: frame.minY },
  ];
  drawColoredPath(ctx, corners, color, width);
}

function drawDividerWith(
  ctx: CanvasRenderingContext2D,
  line: AxisLine,
  color: string,
  width: number,
): void {
  const offsets = line.doubled ? [-DOUBLE_LINE_OFFSET, DOUBLE_LINE_OFFSET] : [0];
  for (const offset of offsets) {
    drawColoredPath(ctx, axisLineEnds(line, line.position + offset), color, width);
  }
}

export function drawCell(
  ctx: CanvasRenderingContext2D,
  bounds: BoundingBox,
  index: number,
  label: string,
): void {
  ctx.save();
  ctx.fillStyle = CELL_COLORS[index % CELL_COLORS.length];
  ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  ctx.fillStyle = CELL_LABEL_COLOR;
  ctx.font = CELL_LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, (bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
  ctx.restore();
}

export function drawRejectedAxisLine(ctx: CanvasRenderingContext2D, line: AxisLine): void {
  drawRejected(ctx, axisLineEnds(line, line.position));
}

function axisLineEnds(line: AxisLine, position: number): [Point, Point] {
  return line.orientation === 'horizontal'
    ? [
        { x: line.start, y: position },
        { x: line.end, y: position },
      ]
    : [
        { x: position, y: line.start },
        { x: position, y: line.end },
      ];
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
