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
      <Rect
        x={0} y={0}
        width={W} height={H}
        fill={color || '#ef4444'}
        opacity={0.18}
        cornerRadius={8}
        listening={false}
      />
      <Text
        x={0} y={0}
        width={W} height={H}
        text={name || 'Team'}
        fontSize={28}
        fontStyle='bold'
        fontFamily={fontFamily}
        fill={color || '#ef4444'}
        opacity={0.6}
        align='center'
        verticalAlign='middle'
        listening={false}
      />
    </Group>
  );
};
