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
  const { id, x, y, name, color, isVisible } = shape;

  if (!isVisible) return null;

  const W = 220;
  const H = 60;
  const len = (name || 'Team').length;
  const fontSize = len <= 6 ? 28 : len <= 10 ? 22 : len <= 14 ? 17 : 13;

  const c = color || '#ef4444';
  const outlineColor = getLuminance(c) > 0.5 ? '#111827' : 'white';

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
    <Group x={x} y={y} draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}>
      {/* タッチ・クリックのヒット領域（不可視） */}
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
        text={name || 'Team'}
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
    </Group>
  );
};
