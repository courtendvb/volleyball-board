import { Group, Line, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ArrowShape, LineShape } from '../types';
import type { Board } from '../hooks/useBoard';

const ARROW_SIZE = 14;
const HANDLE_RADIUS = 8;

// ─── Arrow ────────────────────────────────────────────────────

interface ArrowProps {
  shape: ArrowShape;
  board: Board;
  isSelected: boolean;
}

export const ArrowShapeRenderer = ({ shape, board, isSelected }: ArrowProps) => {
  const { id, points, color, strokeWidth, isBezier } = shape;

  if (points.length < 4) return null;

  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];
  const prevX = points[points.length - 4];
  const prevY = points[points.length - 3];
  const angle = Math.atan2(lastY - prevY, lastX - prevX);

  const arrowPts = [
    lastX - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
    lastY - ARROW_SIZE * Math.sin(angle - Math.PI / 6),
    lastX,
    lastY,
    lastX - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
    lastY - ARROW_SIZE * Math.sin(angle + Math.PI / 6),
  ];

  // 全体移動時のバグ修正: pointsのみを更新し、x, yは0に固定する
  // リアルタイム性を高めるため、onDragMoveで更新し、座標変換を確実に
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (e.target !== e.currentTarget) return;
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target !== e.currentTarget) return;
    
    const dx = e.target.x();
    const dy = e.target.y();
    
    // 座標をPointsへ吸収させ、Groupを0,0に戻す (正規化)
    e.target.x(0);
    e.target.y(0);
    board.updateShape(id, {
      x: 0,
      y: 0,
      points: points.map((v, i) => i % 2 === 0 ? v + dx + (shape.x || 0) : v + dy + (shape.y || 0)),
    });
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

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    handleSelect(e.evt.shiftKey);
  };

  const handleTap = (e: KonvaEventObject<TouchEvent>) => {
    e.cancelBubble = true;
    handleSelect(false);
  };

  // 頂点移動: リアルタイムに反映
  const handlePointDragMove = (e: KonvaEventObject<DragEvent>, idx: number) => {
    const newPoints = [...points];
    // 親Groupのx,yを考慮して絶対座標（世界座標）を計算
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints });
  };

  const handlePointDragEnd = (e: KonvaEventObject<DragEvent>, idx: number) => {
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    // ドラッグ終了時にGroupを0,0に正規化
    board.updateShape(id, { points: newPoints, x: 0, y: 0 });
  };

  // 頂点の追加 (辺の中間地点をドラッグ)
  // ドラッグ開始時に点を作成し、以降はその点を動かす
  const handleMidpointDragStart = (e: KonvaEventObject<DragEvent>, segmentIdx: number) => {
    const newPoints = [...points];
    const newX = e.target.x() + (shape.x || 0);
    const newY = e.target.y() + (shape.y || 0);
    newPoints.splice((segmentIdx + 1) * 2, 0, newX, newY);
    board.updateShape(id, { points: newPoints });
    // 注意: react-konvaでは現在のドラッグ対象を切り替えるのが難しいため、
    // ここでは1点追加してドラッグを継続させる。
  };

  const handleMidpointDragMove = (e: KonvaEventObject<DragEvent>, segmentIdx: number) => {
    // 追加された点のインデックスは segmentIdx + 1
    const idx = segmentIdx + 1;
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints });
  };

  const handleMidpointDragEnd = (e: KonvaEventObject<DragEvent>, segmentIdx: number) => {
    const idx = segmentIdx + 1;
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints, x: 0, y: 0 });
  };

  const lineColor = isSelected ? '#3b82f6' : color;
  const lineWidth = isSelected ? strokeWidth + 1 : strokeWidth;

  return (
    <Group 
      x={shape.x || 0} y={shape.y || 0} 
      draggable onDragMove={handleDragMove} onDragEnd={handleDragEnd} 
      onClick={handleClick} onTap={handleTap}
    >
      <Line
        points={points}
        stroke='transparent'
        strokeWidth={Math.max(strokeWidth, 12)}
        tension={isBezier ? 0.35 : 0}
        lineCap='round'
        lineJoin='round'
      />
      <Line
        points={points}
        stroke={lineColor}
        strokeWidth={lineWidth}
        tension={isBezier ? 0.35 : 0}
        lineCap='round'
        lineJoin='round'
        listening={false}
      />
      <Line
        points={arrowPts}
        stroke={lineColor}
        strokeWidth={lineWidth}
        lineCap='round'
        lineJoin='round'
        listening={false}
      />
      {isSelected && (
        <>
          {/* 通常の頂点ハンドル */}
          {Array.from({ length: Math.floor(points.length / 2) }, (_, i) => (
            <Circle
              key={`h${i}`}
              x={points[i * 2] - (shape.x || 0)}
              y={points[i * 2 + 1] - (shape.y || 0)}
              radius={HANDLE_RADIUS}
              fill='white'
              stroke='#3b82f6'
              strokeWidth={2}
              shadowBlur={3}
              draggable
              onMouseDown={e => { e.cancelBubble = true; }}
              onDragMove={e => handlePointDragMove(e, i)}
              onDragEnd={e => handlePointDragEnd(e, i)}
            />
          ))}
          {/* 中間ハンドル (頂点追加用) */}
          {Array.from({ length: Math.floor(points.length / 2) - 1 }, (_, i) => {
            const mx = (points[i * 2] + points[(i + 1) * 2]) / 2 - (shape.x || 0);
            const my = (points[i * 2 + 1] + points[(i + 1) * 2 + 1]) / 2 - (shape.y || 0);
            return (
              <Circle
                key={`m${i}`}
                x={mx}
                y={my}
                radius={HANDLE_RADIUS - 2}
                fill='white'
                opacity={0.8}
                stroke='#6366f1'
                strokeWidth={2}
                draggable
                onMouseDown={e => { e.cancelBubble = true; }}
                onDragStart={e => handleMidpointDragStart(e, i)}
                onDragMove={e => handleMidpointDragMove(e, i)}
                onDragEnd={e => handleMidpointDragEnd(e, i)}
              />
            );
          })}
        </>
      )}
    </Group>
  );
};

// ─── Line (no arrowhead) ──────────────────────────────────────

interface LineProps {
  shape: LineShape;
  board: Board;
  isSelected: boolean;
}

export const LineShapeRenderer = ({ shape, board, isSelected }: LineProps) => {
  const { id, points, color, strokeWidth, dash, isBezier } = shape;

  if (points.length < 4) return null;

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (e.target !== e.currentTarget) return;
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target !== e.currentTarget) return;
    const dx = e.target.x();
    const dy = e.target.y();
    e.target.x(0);
    e.target.y(0);
    board.updateShape(id, {
      x: 0,
      y: 0,
      points: points.map((v, i) => i % 2 === 0 ? v + dx + (shape.x || 0) : v + dy + (shape.y || 0)),
    });
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

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    handleSelect(e.evt.shiftKey);
  };

  const handleTap = (e: KonvaEventObject<TouchEvent>) => {
    e.cancelBubble = true;
    handleSelect(false);
  };

  const handlePointDragMove = (e: KonvaEventObject<DragEvent>, idx: number) => {
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints });
  };

  const handlePointDragEnd = (e: KonvaEventObject<DragEvent>, idx: number) => {
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints, x: 0, y: 0 });
  };

  const handleMidpointDragStart = (e: KonvaEventObject<DragEvent>, segmentIdx: number) => {
    const newPoints = [...points];
    const newX = e.target.x() + (shape.x || 0);
    const newY = e.target.y() + (shape.y || 0);
    newPoints.splice((segmentIdx + 1) * 2, 0, newX, newY);
    board.updateShape(id, { points: newPoints });
  };

  const handleMidpointDragMove = (e: KonvaEventObject<DragEvent>, segmentIdx: number) => {
    const idx = segmentIdx + 1;
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints });
  };

  const handleMidpointDragEnd = (e: KonvaEventObject<DragEvent>, segmentIdx: number) => {
    const idx = segmentIdx + 1;
    const newPoints = [...points];
    newPoints[idx * 2]     = e.target.x() + (shape.x || 0);
    newPoints[idx * 2 + 1] = e.target.y() + (shape.y || 0);
    board.updateShape(id, { points: newPoints, x: 0, y: 0 });
  };

  const lineColor = isSelected ? '#3b82f6' : color;
  const lineWidth = isSelected ? strokeWidth + 1 : strokeWidth;

  return (
    <Group 
      x={shape.x || 0} y={shape.y || 0} 
      draggable onDragMove={handleDragMove} onDragEnd={handleDragEnd} 
      onClick={handleClick} onTap={handleTap}
    >
      <Line
        points={points}
        stroke='transparent'
        strokeWidth={Math.max(strokeWidth, 12)}
        tension={isBezier ? 0.35 : 0}
        lineCap='round'
        lineJoin='round'
      />
      <Line
        points={points}
        stroke={lineColor}
        strokeWidth={lineWidth}
        tension={isBezier ? 0.35 : 0}
        dash={dash && dash.length > 0 ? dash : undefined}
        lineCap='round'
        lineJoin='round'
        listening={false}
      />
      {isSelected && (
        <>
          {Array.from({ length: Math.floor(points.length / 2) }, (_, i) => (
            <Circle
              key={`h${i}`}
              x={points[i * 2] - (shape.x || 0)}
              y={points[i * 2 + 1] - (shape.y || 0)}
              radius={HANDLE_RADIUS}
              fill='white'
              stroke='#3b82f6'
              strokeWidth={2}
              shadowBlur={3}
              draggable
              onMouseDown={e => { e.cancelBubble = true; }}
              onDragMove={e => handlePointDragMove(e, i)}
              onDragEnd={e => handlePointDragEnd(e, i)}
            />
          ))}
          {Array.from({ length: Math.floor(points.length / 2) - 1 }, (_, i) => {
            const mx = (points[i * 2] + points[(i + 1) * 2]) / 2 - (shape.x || 0);
            const my = (points[i * 2 + 1] + points[(i + 1) * 2 + 1]) / 2 - (shape.y || 0);
            return (
              <Circle
                key={`m${i}`}
                x={mx}
                y={my}
                radius={HANDLE_RADIUS - 2}
                fill='white'
                opacity={0.8}
                stroke='#6366f1'
                strokeWidth={2}
                draggable
                onMouseDown={e => { e.cancelBubble = true; }}
                onDragStart={e => handleMidpointDragStart(e, i)}
                onDragMove={e => handleMidpointDragMove(e, i)}
                onDragEnd={e => handleMidpointDragEnd(e, i)}
              />
            );
          })}
        </>
      )}
    </Group>
  );
};
