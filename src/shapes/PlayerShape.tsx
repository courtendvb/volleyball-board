import { Group, Circle, Text, Label, Tag } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { PlayerShape } from '../types';
import type { Board } from '../hooks/useBoard';

const SIZE = 70;
const RADIUS = SIZE / 2;

const getLuminance = (hex: string) => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  } else if (c.length !== 6) {
    if (c === 'white' || c === 'transparent') return 1;
    return 0;
  }
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const getContrastColor = (hex: string) =>
  getLuminance(hex) > 0.45 ? '#111827' : 'white';

interface Props {
  shape: PlayerShape;
  board: Board;
  isSelected: boolean;
  fontFamily?: string;
  isSelectTool?: boolean;
}

export const PlayerShapeRenderer = ({ shape, board, isSelected, fontFamily = 'system-ui, -apple-system, sans-serif', isSelectTool = true }: Props) => {
  const { id, x, y, color, number, name, namePosition, position, isVisible, nameColor } = shape;
  const textColor = getContrastColor(color || '#ef4444');
  const numLen = number.length;
  const isHandwriting = fontFamily.includes('Zen Maru');
  const numFontSize = (numLen <= 1 ? 52 : numLen === 2 ? 49 : 30) * (isHandwriting ? 1.15 : 1);

  // フォントごとの表示位置微調整（ Konvaはフォントによって垂直方向の中心がずれるため）
  let offsetX = 0;
  let offsetY = -4; // デフォルト（標準/system-ui）

  if (fontFamily.includes('Zen Maru')) {
    offsetY = -7;
    offsetX = 1;
  } else if (fontFamily.includes('M PLUS')) {
    offsetY = -3;
  } else if (fontFamily.includes('Oswald')) {
    offsetY = -6;
    offsetX = 3;
  }

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
    <Group
      x={x}
      y={y}
      draggable={isSelectTool}
      visible={isVisible}
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
          fill={nameColor === 'white' ? 'white' : '#111827'}
          align='center'
          shadowColor={nameColor === 'white' ? 'black' : 'white'}
          shadowBlur={4}
          shadowOpacity={1}
          listening={false}
        />
      )}
    </Group>
  );
};
