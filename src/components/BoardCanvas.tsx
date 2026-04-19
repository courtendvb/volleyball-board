import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Stage, Layer, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import type { Board } from '../hooks/useBoard';

interface BoardCanvasProps {
  board: Board;
  children?: React.ReactNode;
  tool: 'select' | 'arrow' | 'line' | 'text' | 'rect' | 'circle' | 'ellipse';
  stageRef?: React.RefObject<Konva.Stage | null>;
  onDrawStart?: (wx: number, wy: number) => void;
  onDrawMove?: (wx: number, wy: number) => void;
  onDrawEnd?: (wx: number, wy: number) => void;
  drawBezier?: boolean;
  onBezierPoint?: (wx: number, wy: number) => void;
  onBezierPreview?: (wx: number, wy: number) => void;
  onCanvasClick?: (wx: number, wy: number) => void;
  onFinishBezier?: () => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_FACTOR = 1.08;

const toWorld = (sx: number, sy: number, cam: { x: number; y: number; scale: number }) => ({
  x: (sx - cam.x) / cam.scale,
  y: (sy - cam.y) / cam.scale,
});

export const BoardCanvas = ({
  board, children, tool, stageRef: externalStageRef,
  onDrawStart, onDrawMove, onDrawEnd,
  drawBezier, onBezierPoint, onBezierPreview,
  onCanvasClick, onFinishBezier,
}: BoardCanvasProps) => {
  const { camera, setCamera } = board;
  const containerRef = useRef<HTMLDivElement>(null);
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const [size, setSize] = React.useState({ w: window.innerWidth, h: window.innerHeight });
  const isPanningRef = useRef(false);
  const isDrawingRef = useRef(false);
  const isZoomingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const zoomStartRef = useRef({ screenY: 0, scale: 1, pivotX: 0, pivotY: 0, camX: 0, camY: 0 });

  // Fix pan bug: panCamRef updated synchronously
  const cameraRef = useRef(camera);
  const panCamRef = useRef({ x: 0, y: 0 });
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) board.redo(); else board.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); board.redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board]);

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    // Ctrl + スクロール = ズーム
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const oldScale = cameraRef.current.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR)));

      const mousePointTo = {
        x: (pointer.x - cameraRef.current.x) / oldScale,
        y: (pointer.y - cameraRef.current.y) / oldScale,
      };
      setCamera({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    } else {
      // 通常のスクロール = パン（画面移動）
      setCamera({
        ...cameraRef.current,
        x: cameraRef.current.x - e.evt.deltaX,
        y: cameraRef.current.y - e.evt.deltaY,
      });
    }
  }, [setCamera, stageRef]);

  const lastDist = useRef(0);
  const handleTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length >= 2) {
      isPanningRef.current = false;
      lastDist.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastDist.current === 0) { lastDist.current = dist; return; }

    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = cameraRef.current.scale;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (dist / lastDist.current)));
    const center = {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
    const mousePointTo = {
      x: (center.x - cameraRef.current.x) / oldScale,
      y: (center.y - cameraRef.current.y) / oldScale,
    };
    setCamera({
      scale: newScale,
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
    lastDist.current = dist;
  }, [setCamera]);

  const handleTouchEnd = useCallback(() => { lastDist.current = 0; }, []);

  const isSpaceRef = useRef(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceRef.current = true; };
    const onUp   = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceRef.current = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  const handleStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const isMiddle = e.evt.button === 1;
    const isSpacePan = isSpaceRef.current && e.evt.button === 0;
    const isBackground = e.target === e.target.getStage();
    const isLeft = e.evt.button === 0;
    const ctrlKey = e.evt.ctrlKey;

    if (isMiddle || isSpacePan) {
      isPanningRef.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      panCamRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
      e.evt.preventDefault();
      return;
    }

    // Ctrl + 左ドラッグ = ズーム
    if (isLeft && ctrlKey) {
      isZoomingRef.current = true;
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      zoomStartRef.current = {
        screenY: e.evt.clientY,
        scale: cameraRef.current.scale,
        pivotX: ptr?.x ?? e.evt.clientX,
        pivotY: ptr?.y ?? e.evt.clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
      };
      e.evt.preventDefault();
      return;
    }

    // テキストツール: クリックで位置確定
    if (tool === 'text' && isLeft && isBackground) {
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      if (!ptr) return;
      const w = toWorld(ptr.x, ptr.y, cameraRef.current);
      onCanvasClick?.(w.x, w.y);
      e.evt.preventDefault();
      return;
    }

    // ベジェモード: クリックで点追加
    if (drawBezier && (tool === 'arrow' || tool === 'line') && isLeft && !ctrlKey) {
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      if (!ptr) return;
      const w = toWorld(ptr.x, ptr.y, cameraRef.current);
      onBezierPoint?.(w.x, w.y);
      e.evt.preventDefault();
      return;
    }

    // 描画ツール (非ベジェ)
    if ((tool === 'arrow' || tool === 'line' || tool === 'rect' || tool === 'circle' || tool === 'ellipse') && isLeft && !ctrlKey) {
      isDrawingRef.current = true;
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      if (!ptr) return;
      const w = toWorld(ptr.x, ptr.y, cameraRef.current);
      onDrawStart?.(w.x, w.y);
      e.evt.preventDefault();
      return;
    }

    // 選択ツール: 背景を左ドラッグ = 視点移動
    if (tool === 'select' && isLeft && isBackground) {
      isPanningRef.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      panCamRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
      board.clearSelection();
      return;
    }
  }, [tool, board, drawBezier, onDrawStart, onBezierPoint, onCanvasClick]);

  const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current) {
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;
      panCamRef.current = { x: panCamRef.current.x + dx, y: panCamRef.current.y + dy };
      setCamera({ x: panCamRef.current.x, y: panCamRef.current.y });
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    // Ctrl+ドラッグ ズーム: 上=ズームイン、下=ズームアウト
    if (isZoomingRef.current) {
      const dy = zoomStartRef.current.screenY - e.evt.clientY;
      const factor = Math.pow(1.006, dy);
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, zoomStartRef.current.scale * factor));
      const { pivotX, pivotY, camX, camY, scale: startScale } = zoomStartRef.current;
      setCamera({
        scale: newScale,
        x: pivotX - (pivotX - camX) / startScale * newScale,
        y: pivotY - (pivotY - camY) / startScale * newScale,
      });
      return;
    }

    // ベジェプレビュー
    if (drawBezier && (tool === 'arrow' || tool === 'line')) {
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      if (!ptr) return;
      const w = toWorld(ptr.x, ptr.y, cameraRef.current);
      onBezierPreview?.(w.x, w.y);
      return;
    }

    if (isDrawingRef.current) {
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      if (!ptr) return;
      const w = toWorld(ptr.x, ptr.y, cameraRef.current);
      onDrawMove?.(w.x, w.y);
    }
  }, [setCamera, drawBezier, tool, onDrawMove, onBezierPreview]);

  const handleStageMouseUp = useCallback((_e: KonvaEventObject<MouseEvent>) => {
    isPanningRef.current = false;
    isZoomingRef.current = false;

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const stage = stageRef.current;
      const ptr = stage?.getPointerPosition();
      if (!ptr) return;
      const w = toWorld(ptr.x, ptr.y, cameraRef.current);
      onDrawEnd?.(w.x, w.y);
    }
  }, [onDrawEnd]);

  const handleDblClick = useCallback(() => {
    if (drawBezier && (tool === 'arrow' || tool === 'line')) {
      onFinishBezier?.();
    }
  }, [drawBezier, tool, onFinishBezier]);

  const cursor = tool === 'select' ? 'default' : 'crosshair';

  const gridDots = useMemo(() => {
    if (!board.showGrid) return null;
    const gs = board.gridSize;
    if (gs <= 0) return null;
    // 画面に見えるワールド範囲を計算
    const worldLeft = -camera.x / camera.scale;
    const worldTop = -camera.y / camera.scale;
    const worldRight = (size.w - camera.x) / camera.scale;
    const worldBottom = (size.h - camera.y) / camera.scale;
    const x0 = Math.floor(worldLeft / gs) * gs;
    const y0 = Math.floor(worldTop / gs) * gs;
    const cols = Math.ceil((worldRight - x0) / gs) + 1;
    const rows = Math.ceil((worldBottom - y0) / gs) + 1;
    if (cols * rows > 6000) return null; // ズームアウト時の描画爆発回避
    const dots: React.ReactNode[] = [];
    const r = Math.max(0.6, 1 / camera.scale);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push(
          <Circle
            key={`${i}-${j}`}
            x={x0 + i * gs} y={y0 + j * gs}
            radius={r}
            fill='rgba(128, 128, 140, 0.42)'
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      }
    }
    return dots;
  }, [board.showGrid, board.gridSize, camera.x, camera.y, camera.scale, size.w, size.h]);

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, background: 'var(--canvas-bg)', cursor }}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        x={camera.x}
        y={camera.y}
        scaleX={camera.scale}
        scaleY={camera.scale}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleDblClick}
      >
        {gridDots && <Layer listening={false}>{gridDots}</Layer>}
        {children}
      </Stage>
    </div>
  );
};
