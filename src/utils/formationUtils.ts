export const ROTATIONS = ['S1', 'S4', 'S6', 'S3', 'S5', 'S2'] as const;

// ── 座標変換ヘルパー ──────────────────────────
export const getCourtParams = (props: { courtType: string; orientation: string; flipped: boolean }) => {
  const SCALE = 52; const COURT_H = 18 * SCALE; const FREE_ZONE = 2 * SCALE;
  const { courtType, orientation, flipped } = props;
  let viewH = COURT_H + FREE_ZONE * 2; let vy = -FREE_ZONE;
  if      (courtType === 'half')     { viewH = (COURT_H / 2) + FREE_ZONE * 2; vy = flipped ? -FREE_ZONE : (COURT_H / 2) - FREE_ZONE; }
  else if (courtType === 'center')   { viewH = 8 * SCALE + FREE_ZONE * 2; vy = (COURT_H / 2) - 4 * SCALE - FREE_ZONE; }
  else if (courtType === 'top35')    { viewH = 10.8 * SCALE + FREE_ZONE * 2; vy = -FREE_ZONE; }
  else if (courtType === 'bottom35') { viewH = 10.8 * SCALE + FREE_ZONE * 2; vy = COURT_H - 10.8 * SCALE - FREE_ZONE; }
  const viewW = 9 * SCALE + FREE_ZONE * 2;
  return { viewW, viewH, vy, isHoriz: orientation === 'horizontal', flipped: !!flipped, courtType, orientation };
};

// ── 初期配置（ゾーン1〜6）の netX/netY 定義 ──────────────────────────
export const BASE_FORMATION: Record<string, { netX: number; netY: number; mSize: number }> = {
  S:   { netX:  156, netY: 338, mSize: 78 }, // Zone 1
  OH1: { netX:  156, netY: 130, mSize: 78 }, // Zone 2
  MB2: { netX:    0, netY: 130, mSize: 78 }, // Zone 3
  OP:  { netX: -156, netY: 130, mSize: 78 }, // Zone 4
  OH2: { netX: -156, netY: 338, mSize: 78 }, // Zone 5
  MB1: { netX:    0, netY: 338, mSize: 78 }, // Zone 6
  L:   { netX:    0, netY: 520, mSize: 78 }, // コート外
};

export const applyCourtTransform = (
  physX: number,
  physY: number,
  courtX: number,
  courtY: number,
  isHoriz: boolean,
  flipped: boolean
): { worldX: number; worldY: number } => {
  const localX = 234 + physX;
  const localY = 468 + physY;
  
  const rotationRad = (isHoriz ? -90 : flipped ? 180 : 0) * Math.PI / 180;
  const COURT_W = 468;
  const COURT_H = 936;
  
  const offsetX = isHoriz ? 0 : flipped ? COURT_W : 0;
  const offsetY = isHoriz ? COURT_W : flipped ? COURT_H : 0;
  
  const x1 = localX - offsetX;
  const y1 = localY - offsetY;
  
  const worldX = courtX + x1 * Math.cos(rotationRad) - y1 * Math.sin(rotationRad);
  const worldY = courtY + x1 * Math.sin(rotationRad) + y1 * Math.cos(rotationRad);
  
  return { worldX, worldY };
};

export const invertCourtTransform = (
  worldX: number,
  worldY: number,
  courtX: number,
  courtY: number,
  isHoriz: boolean,
  flipped: boolean
): { physX: number; physY: number } => {
  const rotationRad = (isHoriz ? -90 : flipped ? 180 : 0) * Math.PI / 180;
  const COURT_W = 468;
  const COURT_H = 936;
  
  const offsetX = isHoriz ? 0 : flipped ? COURT_W : 0;
  const offsetY = isHoriz ? COURT_W : flipped ? COURT_H : 0;
  
  // subtract translation
  const tx = worldX - courtX;
  const ty = worldY - courtY;
  
  // unrotate
  const x1 = tx * Math.cos(-rotationRad) - ty * Math.sin(-rotationRad);
  const y1 = tx * Math.sin(-rotationRad) + ty * Math.cos(-rotationRad);
  
  const localX = x1 + offsetX;
  const localY = y1 + offsetY;
  
  return { physX: localX - 234, physY: localY - 468 };
};

export const calcBasePositions = (
  courtX: number,
  courtY: number,
  courtProps: { courtType: string; orientation: string; flipped: boolean },
  team: 'A' | 'B'
): Record<string, { x: number; y: number }> => {
  const { courtType, orientation, flipped } = courtProps;
  const isHoriz = orientation === 'horizontal';

  let isBottomTarget = true;
  if      (courtType === 'top35')    isBottomTarget = false;
  else if (courtType === 'bottom35') isBottomTarget = true;
  else if (courtType === 'half')     isBottomTarget = !flipped;
  else                               isBottomTarget = team === 'A' ? !flipped : flipped;

  const result: Record<string, { x: number; y: number }> = {};
  Object.entries(BASE_FORMATION).forEach(([role, { netX, netY, mSize }]) => {
    const physX = isBottomTarget ? netX : -netX;
    const physY = isBottomTarget ? netY : -netY;
    const { worldX, worldY } = applyCourtTransform(physX, physY, courtX, courtY, isHoriz, flipped);
    result[role] = { x: worldX - mSize / 2, y: worldY - mSize / 2 };
  });
  return result;
};

// ── レセプション陣形プリセット ───────────────────────────────────
const RECEPTION_A: Record<string, Record<string, { netX: number; netY: number }>> = {
  S1: {
    OP:  { netX: -183.4, netY: 168.0 },
    L:   { netX:   8.6,  netY: 353.0 },
    S:   { netX: 195.7,  netY: 412.3 },
    OH1: { netX: 172.0,  netY: 330.7 },
    OH2: { netX: -130,   netY: 345   },
    MB1: { netX: -289.1, netY: 405.9 },
    MB2: { netX: -14.0,  netY: 134.5 },
  },
  S2: {
    OP:  { netX: -20.0,  netY: 429.0 },
    L:   { netX: 148.0,  netY: 351.7 },
    S:   { netX:  89.3,  netY:  56.3 },
    OH1: { netX: -128.2, netY: 318.1 },
    OH2: { netX:  20.8,  netY: 346.3 },
    MB1: { netX: -294.2, netY: 410.9 },
    MB2: { netX: -191.4, netY: 124.3 },
  },
  S3: {
    OP:  { netX:  90.2,  netY: 416.3 },
    L:   { netX:  13.7,  netY: 346.7 },
    S:   { netX:  72.9,  netY:  44.9 },
    OH1: { netX: -134.6, netY: 340.9 },
    OH2: { netX: 128.4,  netY: 341.2 },
    MB1: { netX: 178.4,  netY: 180.4 },
    MB2: { netX: -285.1, netY: 408.1 },
  },
  S4: {
    OP:  { netX: 209.3,  netY: 420.1 },
    L:   { netX: 161.9,  netY: 355.5 },
    S:   { netX: -199.5, netY:  44.9 },
    OH1: { netX:   9.8,  netY: 335.8 },
    OH2: { netX: -141.4, netY: 323.5 },
    MB1: { netX: -162.4, netY: 170.2 },
    MB2: { netX: -285.1, netY: 408.1 },
  },
  S5: {
    OP:  { netX: 168.8,  netY: 145.2 },
    L:   { netX: 161.9,  netY: 355.5 },
    S:   { netX: -85.5,  netY: 180.5 },
    OH1: { netX:   9.8,  netY: 335.8 },
    OH2: { netX: -141.4, netY: 323.5 },
    MB1: { netX: -176.4, netY: 146.2 },
    MB2: { netX: -285.1, netY: 408.1 },
  },
  S6: {
    OP:  { netX:  44.6,  netY: 114.8 },
    L:   { netX:   8.6,  netY: 353.0 },
    S:   { netX:  77.9,  netY: 179.2 },
    OH1: { netX: 166.9,  netY: 340.9 },
    OH2: { netX: -140.1, netY: 328.5 },
    MB1: { netX: -289.1, netY: 405.9 },
    MB2: { netX: 171.0,  netY: 154.7 },
  },
};

const RECEPTION_B: Record<string, Record<string, { netX: number; netY: number }>> = {
  S1: { S: { netX:  140, netY:  50 }, OH1: { netX:  115, netY: 275 }, MB2: { netX:    5, netY:  80 }, OP: { netX: -115, netY: 225 }, OH2: { netX: -130, netY: 345 }, MB1: { netX:   20, netY: 340 }, L: { netX:   20, netY: 315 } },
  S2: { S: { netX:  140, netY:  50 }, OH1: { netX:  130, netY: 345 }, MB2: { netX:   65, netY:  80 }, OP: { netX:  -40, netY:  80 }, OH2: { netX: -130, netY: 215 }, MB1: { netX: -100, netY: 340 }, L: { netX:  -35, netY: 320 } },
  S3: { S: { netX:  140, netY:  50 }, OH1: { netX:   15, netY: 340 }, MB2: { netX:  130, netY: 340 }, OP: { netX:   60, netY:  80 }, OH2: { netX:  -40, netY:  80 }, MB1: { netX: -130, netY: 185 }, L: { netX:   70, netY: 315 } },
  S4: { S: { netX:  140, netY:  50 }, OH1: { netX: -120, netY: 215 }, MB2: { netX:   10, netY: 340 }, OP: { netX:  130, netY: 340 }, OH2: { netX:   80, netY:  80 }, MB1: { netX:  -30, netY:  80 }, L: { netX:   10, netY: 315 } },
  S5: { S: { netX:  140, netY:  50 }, OH1: { netX: -130, netY: 185 }, MB2: { netX: -110, netY: 340 }, OP: { netX:   20, netY: 340 }, OH2: { netX:  130, netY: 340 }, MB1: { netX:   75, netY:  80 }, L: { netX:  -80, netY: 315 } },
  S6: { S: { netX:  140, netY:  50 }, OH1: { netX:  -15, netY:  80 }, MB2: { netX: -130, netY: 185 }, OP: { netX: -110, netY: 340 }, OH2: { netX:   20, netY: 340 }, MB1: { netX:  130, netY: 340 }, L: { netX:   20, netY: 315 } },
};

const buildDefaultRotations = () => {
  const result: Record<string, Record<string, Record<string, any>>> = { A: {}, B: {} };
  (['A', 'B'] as const).forEach(team => {
    const src = team === 'A' ? RECEPTION_A : RECEPTION_B;
    Object.entries(src).forEach(([rot, positions]) => {
      result[team][rot] = {};
      Object.entries(positions).forEach(([role, pos]) => {
        result[team][rot][role] = { ...pos, mSize: 78 };
      });
    });
  });
  return result;
};

export const DEFAULT_ROTATIONS = buildDefaultRotations();
