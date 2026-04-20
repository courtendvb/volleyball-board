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

export const TeamLabelShapeRenderer = ({ shape, board, isSelected, fontFamily = 'system-ui, -apple-system, sans-serif' }: Props) => {
  const { id, x, y, name, color, isVisible } = shape;

  if (!isVisible) return null;

  const W = 220;
  const H = 60;
  const len = (name || 'Team').length;
  const fontSize = len <= 6 ? 28 : len <= 10 ? 22 : len <= 14 ? 17 : 13;

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

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    handleSelect(e.evt.shiftKey);
  };

  const handleTap = (e: KonvaEventObject<TouchEvent>) => {
    e.cancelBubble = true;
    handleSelect(false);
  };

  return (
    <Group x={x} y={y} draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}>
      {isSelected && (
        <Rect
          x={-4} y={-4}
          width={W + 8} height={H + 8}
          stroke='#3b82f6' strokeWidth={2}
          dash={[4, 3]} fill='transparent'
          listening={false}
        />
      )}
      {/* 白背景 */}
      <Rect
        x={0} y={0}
        width={W} height={H}
        fill='white'
        opacity={0.82}
        cornerRadius={8}
        listening={false}
      />
      {/* チームカラーの左端アクセント */}
      <Rect
        x={0} y={0}
        width={6} height={H}
        fill={color || '#ef4444'}
        cornerRadius={[8, 0, 0, 8]}
        listening={false}
      />
      <Text
        x={10} y={0}
        width={W - 10} height={H}
        text={name || 'Team'}
        fontSize={fontSize}
        fontStyle='bold'
        fontFamily={fontFamily}
        fill={color || '#ef4444'}
        align='center'
        verticalAlign='middle'
        listening={false}
      />
    </Group>
  );
};
