import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { simplifyPath } from '../../../core/geometry/simplify-path';
import { parseSketchFile, serializeSketch } from '../../../core/model/sketch-file';
import { SEGMENTATION_TOLERANCE_PX } from '../../../core/recognition/segmentation/segmentation-config';
import { PointerType, Stroke, StrokePoint } from '../../../core/model/stroke';
import { downloadTextFile, sketchFileName } from '../sketch-file-io';
import { applyStrokeStyle, drawSegment, drawSimplifiedPath, drawStroke } from '../stroke-renderer';

const LOAD_TIME_GAP_MS = 1000;

interface StrokeInProgress {
  readonly id: number;
  readonly pointerId: number;
  readonly pointerType: PointerType;
  readonly canvasRect: DOMRect;
  readonly timeOrigin: number;
  readonly points: StrokePoint[];
}

@Component({
  imports: [],
  selector: 'app-sketch-canvas',
  styleUrl: './sketch-canvas.css',
  templateUrl: './sketch-canvas.html',
})
export class SketchCanvas {
  protected readonly strokes = signal<readonly Stroke[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly showSegments = signal(false);
  protected readonly tolerance = signal(SEGMENTATION_TOLERANCE_PX);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx: CanvasRenderingContext2D | null = null;

  private cssWidth = 0;
  private cssHeight = 0;

  private current: StrokeInProgress | null = null;
  private nextId = 1;
  private sketchStart: number | null = null;
  private timeOffset = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx = canvas.getContext('2d');

      const observer = new ResizeObserver(() => this.resize());
      observer.observe(canvas);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    effect(() => {
      this.strokes();
      this.showSegments();
      this.tolerance();
      this.redraw();
    });
  }

  protected onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 || this.current) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    canvas.setPointerCapture(e.pointerId);

    this.sketchStart ??= e.timeStamp - this.timeOffset;

    const canvasRect = canvas.getBoundingClientRect();
    const timeOrigin = this.sketchStart;
    const first = toStrokePoint(e, canvasRect, timeOrigin);

    this.current = {
      id: this.nextId++,
      pointerId: e.pointerId,
      pointerType: toPointerType(e.pointerType),
      canvasRect,
      timeOrigin,
      points: [first],
    };

    if (this.ctx) {
      drawStroke(this.ctx, [first]);
    }
  }

  protected onPointerMove(e: PointerEvent): void {
    const current = this.current;
    if (!current || e.pointerId !== current.pointerId) {
      return;
    }

    const coalesced = e.getCoalescedEvents();
    const events = coalesced.length > 0 ? coalesced : [e];

    for (const event of events) {
      const point = toStrokePoint(event, current.canvasRect, current.timeOrigin);
      const previous = current.points[current.points.length - 1];
      current.points.push(point);

      if (this.ctx) {
        drawSegment(this.ctx, previous, point);
      }
    }
  }

  protected onPointerUp(e: PointerEvent): void {
    const current = this.current;
    if (!current || e.pointerId !== current.pointerId) {
      return;
    }

    this.current = null;
    const stroke: Stroke = {
      id: current.id,
      pointerType: current.pointerType,
      points: current.points,
    };
    this.strokes.update((strokes) => [...strokes, stroke]);
  }

  protected clear(): void {
    this.load([]);
  }

  protected save(): void {
    const json = serializeSketch(this.strokes(), { width: this.cssWidth, height: this.cssHeight });
    downloadTextFile(sketchFileName(new Date()), json, 'application/json');
  }

  protected async onFileSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    try {
      this.load(parseSketchFile(await file.text()).strokes);
    } catch (error) {
      this.loadError.set(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private load(strokes: readonly Stroke[]): void {
    this.current = null;
    this.nextId = maxStrokeId(strokes) + 1;
    this.sketchStart = null;
    this.timeOffset = strokes.length > 0 ? lastPointTime(strokes) + LOAD_TIME_GAP_MS : 0;
    this.loadError.set(null);
    this.strokes.set(strokes);
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const dpr = window.devicePixelRatio || 1;

    this.cssWidth = canvas.clientWidth;
    this.cssHeight = canvas.clientHeight;

    canvas.width = Math.round(this.cssWidth * dpr);
    canvas.height = Math.round(this.cssHeight * dpr);

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyStrokeStyle(this.ctx);
    }

    this.redraw();
  }

  private redraw(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    for (const stroke of this.strokes()) {
      drawStroke(ctx, stroke.points);
    }
    if (this.current) {
      drawStroke(ctx, this.current.points);
    }
    if (this.showSegments()) {
      for (const stroke of this.strokes()) {
        drawSimplifiedPath(ctx, simplifyPath(stroke.points, this.tolerance()));
      }
    }
  }
}

function toStrokePoint(e: PointerEvent, canvasRect: DOMRect, timeOrigin: number): StrokePoint {
  return {
    x: e.clientX - canvasRect.left,
    y: e.clientY - canvasRect.top,
    time: e.timeStamp - timeOrigin,
    ...(e.pointerType === 'pen' ? { pressure: e.pressure } : {}),
  };
}

function maxStrokeId(strokes: readonly Stroke[]): number {
  return strokes.reduce((max, stroke) => Math.max(max, stroke.id), 0);
}

function lastPointTime(strokes: readonly Stroke[]): number {
  return strokes.reduce(
    (latest, stroke) => stroke.points.reduce((t, point) => Math.max(t, point.time), latest),
    0,
  );
}

function toPointerType(value: string): PointerType {
  return value === 'pen' || value === 'touch' ? value : 'mouse';
}
