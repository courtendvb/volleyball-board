import { useRef, useEffect } from 'react';
import { Rect, Circle, Ellipse, Transformer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import type { RectShape, CircleShape, EllipseShape } from '../types';
import type { Board } from '../hooks/useBoard';

// ── Rect ────────────────────────────────────────────────────────

interface RectProps { shape: RectShape; board: Board; isSelected: boolean; showTransformer?: boolean; }

export const RectShapeRenderer = ({ shape, board, isSelected, showTransformer }: RectProps) => {
  const { id, x, y, width, height, color, strokeWidth } = shape;
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (showTransformer && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [showTransformer]);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    board.updateShape(id, { x: board.snap(e.target.x()), y: board.snap(e.target.y()) });
  };
  const handleSelect = (shiftKey: boolean) => {
    if (shiftKey) {
      const sel = board.selectedIds.includes(id)
        ? board.selectedIds.filter(i => i !== id)
        : [...board.selectedIds, id];
      board.select(sel);
    } else {
      board.select([id]);
    }
  };
  const handleClick = (e: KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; handleSelect(e.evt.shiftKey); };
  const handleTap = (e: KonvaEventObject<TouchEvent>) => { e.cancelBubble = true; handleSelect(false); };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    board.updateShape(id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * node.scaleX()),
      height: Math.max(5, node.height() * node.scaleY()),
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  return (
    <>
      <Rect
        ref={shapeRef}
        x={x} y={y} width={width} height={height}
        stroke={color} strokeWidth={strokeWidth}
        fill={color} opacity={0.3}
        draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}
        onTransformEnd={handleTransformEnd}
        shadowColor={isSelected ? '#3b82f6' : 'transparent'}
        shadowBlur={isSelected ? 10 : 0}
        shadowOpacity={isSelected ? 0.8 : 0}
      />
      {showTransformer && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
        />
      )}
    </>
  );
};

// ── Circle ──────────────────────────────────────────────────────

interface CircleProps { shape: CircleShape; board: Board; isSelected: boolean; }

export const CircleShapeRenderer = ({ shape, board, isSelected }: CircleProps) => {
  const { id, x, y, radius, color, strokeWidth } = shape;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    board.updateShape(id, { x: board.snap(e.target.x()), y: board.snap(e.target.y()) });
  };
  const handleSelect = (shiftKey: boolean) => {
    if (shiftKey) {
      const sel = board.selectedIds.includes(id)
        ? board.selectedIds.filter(i => i !== id)
        : [...board.selectedIds, id];
      board.select(sel);
    } else {
      board.select([id]);
    }
  };
  const handleClick = (e: KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; handleSelect(e.evt.shiftKey); };
  const handleTap = (e: KonvaEventObject<TouchEvent>) => { e.cancelBubble = true; handleSelect(false); };

  return (
    <Circle
      x={x} y={y} radius={radius}
      stroke={color} strokeWidth={strokeWidth}
      fill={color} opacity={0.3}
      draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}
      shadowColor={isSelected ? '#3b82f6' : 'transparent'}
      shadowBlur={isSelected ? 10 : 0}
      shadowOpacity={isSelected ? 0.8 : 0}
    />
  );
};

// ── Ellipse ─────────────────────────────────────────────────────

interface EllipseProps { shape: EllipseShape; board: Board; isSelected: boolean; showTransformer?: boolean; }

export const EllipseShapeRenderer = ({ shape, board, isSelected, showTransformer }: EllipseProps) => {
  const { id, x, y, radiusX, radiusY, color, strokeWidth } = shape;
  const shapeRef = useRef<Konva.Ellipse>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (showTransformer && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [showTransformer]);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    board.updateShape(id, { x: e.target.x(), y: e.target.y() });
  };
  const handleSelect = (shiftKey: boolean) => {
    if (shiftKey) {
      const sel = board.selectedIds.includes(id)
        ? board.selectedIds.filter(i => i !== id)
        : [...board.selectedIds, id];
      board.select(sel);
    } else {
      board.select([id]);
    }
  };
  const handleClick = (e: KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; handleSelect(e.evt.shiftKey); };
  const handleTap = (e: KonvaEventObject<TouchEvent>) => { e.cancelBubble = true; handleSelect(false); };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    board.updateShape(id, {
      x: node.x(),
      y: node.y(),
      radiusX: Math.max(5, node.radiusX() * node.scaleX()),
      radiusY: Math.max(5, node.radiusY() * node.scaleY()),
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  return (
    <>
      <Ellipse
        ref={shapeRef}
        x={x} y={y} radiusX={radiusX} radiusY={radiusY}
        stroke={color} strokeWidth={strokeWidth}
        fill={color} opacity={0.3}
        draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}
        onTransformEnd={handleTransformEnd}
        shadowColor={isSelected ? '#3b82f6' : 'transparent'}
        shadowBlur={isSelected ? 10 : 0}
        shadowOpacity={isSelected ? 0.8 : 0}
      />
      {showTransformer && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
        />
      )}
    </>
  );
};
