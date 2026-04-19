import { Group, Rect, Line, Text, Circle } from 'react-konva';
import type { CourtShape } from '../types';

const SCALE = 52;
const COURT_W = 9 * SCALE;   // 468
const COURT_H = 18 * SCALE;  // 936
const FREE = 2 * SCALE;      // 104

// コートタイプ別の表示範囲
const getView = (courtType: string, flipped: boolean) => {
  switch (courtType) {
    case 'half':
      return flipped
        ? { vy: -FREE, vh: COURT_H / 2 + FREE + 10 }
        : { vy: COURT_H / 2 - 10, vh: COURT_H / 2 + FREE + 10 };
    case 'center':
      return { vy: COURT_H / 2 - 4 * SCALE - FREE, vh: 8 * SCALE + FREE * 2 };
    case 'top35':
      return { vy: -FREE, vh: 10.8 * SCALE + FREE * 2 };
    case 'bottom35':
      return { vy: COURT_H - 10.8 * SCALE - FREE, vh: 10.8 * SCALE + FREE * 2 };
    default: // full
      return { vy: -FREE, vh: COURT_H + FREE * 2 };
  }
};

// 各ハーフの後方セクション中央に配置（4.5m線でできるグリッド基準）
const ZONE_LABELS = [
  { zone: 2, x: COURT_W * 5 / 6, y: COURT_H * 1 / 8 },
  { zone: 3, x: COURT_W / 2,     y: COURT_H * 1 / 8 },
  { zone: 4, x: COURT_W * 1 / 6, y: COURT_H * 1 / 8 },
  { zone: 1, x: COURT_W * 5 / 6, y: COURT_H * 7 / 8 },
  { zone: 6, x: COURT_W / 2,     y: COURT_H * 7 / 8 },
  { zone: 5, x: COURT_W * 1 / 6, y: COURT_H * 7 / 8 },
];

interface Props {
  shape: CourtShape;
}

export const CourtShapeRenderer = ({ shape }: Props) => {
  const { courtType, orientation, flipped, showZones } = shape;
  const isHoriz = orientation === 'horizontal';
  const { vy, vh } = getView(courtType, flipped);
  const vw = COURT_W + FREE * 2;

  const freeLineProps = { stroke: '#ffffff', strokeWidth: 1, dash: [6, 4], listening: false };

  const courtContent = (
    <>
      {/* 背景 */}
      <Rect x={-FREE} y={vy} width={vw} height={vh} fill='#33ccff' listening={false} />

      {/* フリーゾーン */}
      <Rect x={-FREE} y={vy} width={vw} height={FREE - vy > 0 ? FREE + vy < 0 ? FREE : FREE + vy : 0}
        fill='#33ccff' listening={false} />

      {/* コートアウトライン */}
      <Rect x={0} y={0} width={COURT_W} height={COURT_H} fill='#ffcc9c' stroke='#ffffff' strokeWidth={4} listening={false} />

      {/* アタックゾーン */}
      <Rect x={0} y={COURT_H / 2 - 3 * SCALE} width={COURT_W} height={6 * SCALE} fill='#ff9933' listening={false} />

      {/* センターライン（ネット） */}
      <Line points={[0, COURT_H / 2, COURT_W, COURT_H / 2]} stroke='#ffffff' strokeWidth={8} listening={false} />

      {/* 3mライン */}
      <Line points={[0, COURT_H / 2 - 3 * SCALE, COURT_W, COURT_H / 2 - 3 * SCALE]} stroke='#ffffff' strokeWidth={4} listening={false} />
      <Line points={[0, COURT_H / 2 + 3 * SCALE, COURT_W, COURT_H / 2 + 3 * SCALE]} stroke='#ffffff' strokeWidth={4} listening={false} />

      {/* ネットポスト */}
      <Circle x={0} y={COURT_H / 2} radius={5} fill='#374151' listening={false} />
      <Circle x={COURT_W} y={COURT_H / 2} radius={5} fill='#374151' listening={false} />

      {/* ウォーターマーク */}
      <Text
        text='CourtEnd'
        x={COURT_W - 90}
        y={COURT_H + FREE - 20}
        fontSize={12}
        fill='rgba(0,0,0,0.15)'
        fontStyle='bold'
        listening={false}
      />

      {/* ゾーン表示（点線＋番号） */}
      {showZones && (
        <>
          {/* サービスゾーン点線 */}
          <Line points={[COURT_W * 2 / 3, 0, COURT_W * 2 / 3, -FREE]} {...freeLineProps} />
          <Line points={[COURT_W * 2 / 3, COURT_H, COURT_W * 2 / 3, COURT_H + FREE]} {...freeLineProps} />

          {/* 縦ゾーン区切り線 */}
          <Line points={[COURT_W / 3, 0, COURT_W / 3, COURT_H]} stroke='#ffffff' strokeWidth={1} dash={[4, 4]} listening={false} />
          <Line points={[COURT_W * 2 / 3, 0, COURT_W * 2 / 3, COURT_H]} stroke='#ffffff' strokeWidth={1} dash={[4, 4]} listening={false} />

          {/* 横ゾーン区切り線（各ハーフ中央 4.5m） */}
          <Line points={[0, COURT_H / 4, COURT_W, COURT_H / 4]} stroke='#ffffff' strokeWidth={1} dash={[4, 4]} listening={false} />
          <Line points={[0, COURT_H * 3 / 4, COURT_W, COURT_H * 3 / 4]} stroke='#ffffff' strokeWidth={1} dash={[4, 4]} listening={false} />

          {/* ゾーン番号 */}
          {ZONE_LABELS.map(({ zone, x, y }) => (
            <Text
              key={zone}
              text={String(zone)}
              x={x - 40}
              y={y - 40}
              width={80}
              height={80}
              align='center'
              verticalAlign='middle'
              fontSize={60}
              fontStyle='bold'
              fill='rgba(0,0,0,0.18)'
              listening={false}
            />
          ))}
        </>
      )}
    </>
  );

  // クリッピング用の変換
  const rotation = isHoriz ? -90 : flipped ? 180 : 0;
  const offsetX = isHoriz ? 0 : flipped ? COURT_W : 0;
  const offsetY = isHoriz ? COURT_W : flipped ? COURT_H : 0;

  return (
    <Group
      x={shape.x}
      y={shape.y}
      rotation={rotation}
      offsetX={offsetX}
      offsetY={offsetY}
      clipX={-FREE}
      clipY={vy}
      clipWidth={vw}
      clipHeight={vh}
      listening={false}
    >
      {courtContent}
    </Group>
  );
};
