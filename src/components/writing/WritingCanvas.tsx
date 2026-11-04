"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  hasRealPressure,
  inkOutline,
  normalizePoint,
  outlineToPath,
  type Box,
} from "@/lib/strokes/ink";
import type { Stroke } from "@/lib/strokes/types";

interface WritingCanvasProps {
  /** Committed strokes (the parent owns them: undo/clear = change this list). */
  strokes: Stroke[];
  /** Called once per pen-up with the finished, normalized stroke. */
  onStroke: (stroke: Stroke) => void;
  /** Optional CSS color per committed stroke; defaults to the text color. */
  strokeColors?: (string | undefined)[];
  /** Layers drawn under the ink, above the grid (ghost character, guides). */
  underlay?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Square writing box (the largest square that fits the wrapper, so give the
 * wrapper a definite size via `className`): pointer capture + perfect-freehand ink on a DPR-scaled
 * canvas, over a 田字格 grid. Live strokes are drawn per animation frame from
 * refs, so React only re-renders on pen-up.
 */
export function WritingCanvas({
  strokes,
  onStroke,
  strokeColors,
  underlay,
  disabled = false,
  className = "",
}: WritingCanvasProps) {
  const fitRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(0);
  const sideRef = useRef(0);
  const strokesRef = useRef(strokes);
  const colorsRef = useRef(strokeColors);
  const live = useRef<{
    id: number;
    start: number;
    box: Box;
    points: Stroke;
  } | null>(null);
  const frame = useRef(0);
  const pathCache = useRef(
    new WeakMap<Stroke, { side: number; path: Path2D }>(),
  );

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const side = sideRef.current;
    if (!canvas || !ctx || side === 0) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, side, side);
    const ink = getComputedStyle(canvas).color;

    strokesRef.current.forEach((stroke, i) => {
      let cached = pathCache.current.get(stroke);
      if (!cached || cached.side !== side) {
        cached = {
          side,
          path: new Path2D(outlineToPath(inkOutline(stroke, side, true))),
        };
        pathCache.current.set(stroke, cached);
      }
      ctx.fillStyle = colorsRef.current?.[i] ?? ink;
      ctx.fill(cached.path);
    });

    const current = live.current;
    if (current && current.points.length > 0) {
      ctx.fillStyle = ink;
      ctx.fill(
        new Path2D(outlineToPath(inkOutline(current.points, side, false))),
      );
    }
  }, []);

  const scheduleDraw = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  useLayoutEffect(() => {
    strokesRef.current = strokes;
    colorsRef.current = strokeColors;
    scheduleDraw();
  }, [strokes, strokeColors, scheduleDraw]);

  // The box is the largest square that fits the wrapper; the canvas backing
  // store is that size × devicePixelRatio.
  useLayoutEffect(() => {
    const fit = fitRef.current;
    const canvas = canvasRef.current;
    if (!fit || !canvas) return;
    const resize = () => {
      const next = Math.floor(Math.min(fit.clientWidth, fit.clientHeight));
      const dpr = window.devicePixelRatio || 1;
      sideRef.current = next;
      setSide(next);
      canvas.width = Math.round(next * dpr);
      canvas.height = Math.round(next * dpr);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(fit);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", scheduleDraw);
    // A theme picked in Settings flips data-theme on <html>.
    const theme = new MutationObserver(scheduleDraw);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    resize();
    return () => {
      observer.disconnect();
      theme.disconnect();
      scheme.removeEventListener("change", scheduleDraw);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [draw, scheduleDraw]);

  const addPoints = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const current = live.current;
    if (!current || e.pointerId !== current.id) return;
    const native = e.nativeEvent;
    const coalesced = native.getCoalescedEvents?.();
    const events = coalesced && coalesced.length > 0 ? coalesced : [native];
    for (const ev of events) {
      const pressure = hasRealPressure(ev.pointerType, ev.pressure)
        ? ev.pressure
        : undefined;
      current.points.push(
        normalizePoint(
          ev.clientX,
          ev.clientY,
          current.box,
          ev.timeStamp - current.start,
          pressure,
        ),
      );
    }
    scheduleDraw();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || live.current) return; // one stroke at a time
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    live.current = {
      id: e.pointerId,
      start: e.timeStamp,
      box: { left: r.left, top: r.top, width: r.width, height: r.height },
      points: [],
    };
    addPoints(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const current = live.current;
    if (!current || e.pointerId !== current.id) return;
    live.current = null;
    if (current.points.length > 0) onStroke(current.points);
    scheduleDraw();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (live.current?.id !== e.pointerId) return;
    live.current = null;
    scheduleDraw();
  };

  return (
    <div
      ref={fitRef}
      className={`flex items-center justify-center select-none ${className}`}
    >
      <div className="relative" style={{ width: side, height: side }}>
        <GridGuide />
        {underlay && (
          <div className="pointer-events-none absolute inset-0">{underlay}</div>
        )}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none text-foreground [-webkit-touch-callout:none]"
          onPointerDown={onPointerDown}
          onPointerMove={addPoints}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}

/** 田字格 practice square: solid border, dashed center cross. */
function GridGuide() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full rounded-2xl bg-surface text-border"
      aria-hidden
    >
      <rect
        x="0.5"
        y="0.5"
        width="99"
        height="99"
        rx="4"
        fill="none"
        stroke="currentColor"
      />
      <g stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.6">
        <line x1="50" y1="2" x2="50" y2="98" />
        <line x1="2" y1="50" x2="98" y2="50" />
      </g>
    </svg>
  );
}
