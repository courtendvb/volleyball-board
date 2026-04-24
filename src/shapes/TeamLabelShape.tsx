import { Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { TeamLabelShape } from '../types';
import type { Board } from '../hooks/useBoard';

interface Props {
  shape: TeamLabelShape;
  board: Board;
  isSelected: boolean;
  fontFamily?: string;
}

const getLuminance = (hex: string) => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const TeamLabelShapeRenderer = ({ shape, board, isSelected, fontFamily = 'system-ui, -apple-system, sans-serif' }: Props) => {
  const { id, x, y, name, color, isVisible, labelWidth } = shape;

  if (!isVisible) return null;

  const W = labelWidth ?? 300;
  const text = name || 'Team';
  const fontSize = 21; // 70% of player name fontSize (30px)
  const H = 38;

  const c = color || '#ef4444';
  const outlineColor = getLuminance(c) > 0.5 ? '#111827' : 'white';

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

  return (
    <Group x={x} y={y} draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}>
      {/* ヒット領域 */}
      <Rect x={0} y={0} width={W} height={H} fill='transparent' />

      {isSelected && (
        <Rect
          x={-4} y={-4}
          width={W + 8} height={H + 8}
          stroke='#3b82f6' strokeWidth={2}
          dash={[4, 3]} fill='transparent'
          listening={false}
        />
      )}

      <Text
        x={0} y={0}
        width={W} height={H}
        text={text}
        fontSize={fontSize}
        fontStyle='bold'
        fontFamily={fontFamily}
        fill={c}
        stroke={outlineColor}
        strokeWidth={3}
        fillAfterStrokeEnabled
        align='center'
        verticalAlign='middle'
        listening={false}
      />

      {/* 横幅リサイズハンドル（選択時のみ） */}
      {isSelected && (
        <Rect
          x={W - 6}
          y={H / 2 - 14}
          width={12}
          height={28}
          fill='#3b82f6'
          cornerRadius={4}
          draggable
          onDragMove={e => {
            e.target.y(H / 2 - 14);
            const newW = Math.max(80, e.target.x() + 6);
            board.updateShape(id, { labelWidth: newW });
          }}
          onDragEnd={e => {
            const newW = Math.max(80, e.target.x() + 6);
            board.updateShape(id, { labelWidth: newW });
            e.target.position({ x: newW - 6, y: H / 2 - 14 });
          }}
          onMouseDown={e => e.cancelBubble = true}
          onTouchStart={e => e.cancelBubble = true}
          onClick={e => e.cancelBubble = true}
          onTap={e => e.cancelBubble = true}
        />
      )}
    </Group>
  );
};
