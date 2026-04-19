import { Group, Circle, Path } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { BallShape } from '../types';
import type { Board } from '../hooks/useBoard';

const SIZE = 28;
const R = SIZE / 2;

interface Props {
  shape: BallShape;
  board: Board;
  isSelected: boolean;
}

export const BallShapeRenderer = ({ shape, board, isSelected }: Props) => {
  const { id, x, y, isVisible } = shape;

  if (isVisible === false) return null;

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
        <Circle x={R} y={R} radius={R + 4} stroke='#3b82f6' strokeWidth={2} dash={[4, 3]} fill='transparent' listening={false} />
      )}
      {/* ボール本体 */}
      <Circle x={R} y={R} radius={R} fill='white' stroke='#111' strokeWidth={1.5}
        shadowBlur={4} shadowOpacity={0.3} shadowOffsetY={2} />
      {/* ライン */}
      <Path
        data={`M${R * 0.3},${R * 0.4} Q${R * 0.8},${R * 0.55} ${R * 1.5},${R * 0.55}`}
        stroke='#333' strokeWidth={1} fill='transparent' listening={false}
      />
      <Path
        data={`M${R * 1.7},${R * 1.6} Q${R * 1.2},${R * 1.45} ${R * 0.5},${R * 1.45}`}
        stroke='#333' strokeWidth={1} fill='transparent' listening={false}
      />
      <Path
        data={`M${R * 0.3},${R * 0.9} Q${R * 0.4},${R * 1.4} ${R * 0.55},${R * 1.7}`}
        stroke='#333' strokeWidth={1} fill='transparent' listening={false}
      />
      <Path
        data={`M${R * 1.7},${R * 1.1} Q${R * 1.6},${R * 0.6} ${R * 1.45},${R * 0.3}`}
        stroke='#333' strokeWidth={1} fill='transparent' listening={false}
      />
    </Group>
  );
};
