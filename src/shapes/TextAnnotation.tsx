import { Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { TextAnnotation } from '../types';
import type { Board } from '../hooks/useBoard';

interface Props { shape: TextAnnotation; board: Board; isSelected: boolean; }

export const TextAnnotationRenderer = ({ shape, board, isSelected }: Props) => {
  const { id, x, y, text, fontSize, color } = shape;
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
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    handleSelect(e.evt.shiftKey);
  };
  const handleTap = (e: KonvaEventObject<TouchEvent>) => {
    e.cancelBubble = true;
    handleSelect(false);
  };
  return (
    <Text x={x} y={y} text={text} fontSize={fontSize} fill={isSelected ? '#3b82f6' : color}
      fontStyle='bold' draggable onDragEnd={handleDragEnd} onClick={handleClick} onTap={handleTap}
      shadowColor='white' shadowBlur={3} shadowOpacity={0.8}
    />
  );
};
