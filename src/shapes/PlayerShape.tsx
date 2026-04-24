import { Group, Circle, Text, Label, Tag } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { PlayerShape } from '../types';
import type { Board } from '../hooks/useBoard';

const SIZE = 70;
const RADIUS = SIZE / 2;


interface Props {
  shape: PlayerShape;
  board: Board;
  isSelected: boolean;
  fontFamily?: string;
  isSelectTool?: boolean;
  onSnapDrag?: (id: string, x: number, y: number, size: number) => { x: number; y: number };
  onClearGuides?: () => void;
}

export const PlayerShapeRenderer = ({ shape, board, isSelected, fontFamily = 'system-ui, -apple-system, sans-serif', isSelectTool = true, onSnapDrag, onClearGuides }: Props) => {
  const { id, x, y, color, number, name, namePosition, position, isVisible, nameColor } = shape;
  const textColor = nameColor === 'black' ? '#111827' : 'white';
  const numLen = number.length;
  const numFontSize = numLen <= 1 ? 52 : numLen === 2 ? 49 : 30;
  let offsetX = 0;
  let offsetY = -4;
  if (fontFamily.includes('Zen Maru')) { offsetY = -7; offsetX = 1; }
  else if (fontFamily.includes('M PLUS')) { offsetY = -3; }
  else if (fontFamily.includes('Oswald')) { offsetY = -6; offsetX = 3; }
  else if (fontFamily.includes('Fuijifont')) { offsetY = -5; }

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (!onSnapDrag) return;
    const snapped = onSnapDrag(id, e.target.x(), e.target.y(), SIZE);
    e.target.x(snapped.x);
    e.target.y(snapped.y);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onClearGuides?.();
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
    <Group
      x={x}
      y={y}
      draggable={isSelectTool}
      visible={isVisible}
      onDragMove={onSnapDrag ? handleDragMove : undefined}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleTap}
    >
      {/* 選択ハイライト */}
      {isSelected && (
        <Circle
          x={RADIUS}
          y={RADIUS}
          radius={RADIUS + 5}
          stroke='#3b82f6'
          strokeWidth={2}
          dash={[4, 3]}
          fill='transparent'
          listening={false}
        />
      )}

      {/* マーカー本体 */}
      <Circle
        x={RADIUS}
        y={RADIUS}
        radius={RADIUS}
        fill={color || '#1f2937'}
        stroke='#111827'
        strokeWidth={2.5}
        shadowBlur={5}
        shadowOpacity={0.3}
        shadowOffsetY={2}
      />

      {/* 番号 */}
      <Text
        x={offsetX}
        y={offsetY}
        width={SIZE}
        height={SIZE}
        text={number}
        fontSize={numFontSize}
        fontStyle='bold'
        fontFamily={fontFamily}
        fill={textColor}
        align='center'
        verticalAlign='middle'
        listening={false}
      />

      {/* ポジションバッジ */}
      {position && (
        <Label x={RADIUS + 12} y={-10}>
          <Tag fill='#1f2937' cornerRadius={4} />
          <Text text={position} fontSize={16} fontStyle='bold' fill='white' padding={3} fontFamily={fontFamily} />
        </Label>
      )}

      {/* 選手名 */}
      {name && (
        <Text
          x={-70}
          y={namePosition === 'bottom' ? SIZE + 5 : -26}
          width={SIZE + 140}
          text={name}
          fontSize={30}
          fontStyle='bold'
          fontFamily={fontFamily}
          fill='#111827'
          align='center'
          shadowColor='white'
          shadowBlur={4}
          shadowOpacity={1}
          listening={false}
        />
      )}
    </Group>
  );
};
