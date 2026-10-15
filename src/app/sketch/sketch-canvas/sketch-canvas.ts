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
import { PointerType, Stroke, StrokePoint } from '../../../core/model/stroke';
import { applyStrokeStyle, drawSegment, drawStroke } from '../stroke-renderer';

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

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx: CanvasRenderingContext2D | null = null;

  private cssWidth = 0;
  private cssHeight = 0;

  private current: StrokeInProgress | null = null;
  private nextId = 1;
  private sketchStart: number | null = null;

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
      this.redraw();
    });
  }

  protected onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 || this.current) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    canvas.setPointerCapture(e.pointerId);

    this.sketchStart ??= e.timeStamp;

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
    this.current = null;
    this.nextId = 1;
    this.sketchStart = null;
    this.strokes.set([]);
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

function toPointerType(value: string): PointerType {
  return value === 'pen' || value === 'touch' ? value : 'mouse';
}
