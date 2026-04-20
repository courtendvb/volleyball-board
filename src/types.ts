// ── Shape types ───────────────────────────────────────────────

export type ShapeType = 'court' | 'player' | 'ball' | 'team-label' | 'arrow' | 'line' | 'text' | 'rect' | 'circle' | 'ellipse';

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  zIndex: number;
  locked?: boolean;
}

export interface CourtShape extends BaseShape {
  type: 'court';
  courtType: 'full' | 'half' | 'center' | 'top35' | 'bottom35';
  orientation: 'vertical' | 'horizontal';
  flipped: boolean;
  showZones: boolean;
}

export interface PlayerShape extends BaseShape {
  type: 'player';
  team: 'A' | 'B';
  number: string;
  name: string;
  color: string;
  position: string;
  namePosition: 'top' | 'bottom';
  isVisible: boolean;
  isFree: boolean;
  nameColor?: 'white' | 'black';
  slot?: string;
}

export interface BallShape extends BaseShape {
  type: 'ball';
  isVisible: boolean;
}

export interface TeamLabelShape extends BaseShape {
  type: 'team-label';
  team: 'A' | 'B';
  name: string;
  color: string;
  isVisible: boolean;
  labelWidth?: number;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: number[]; // [x1,y1, x2,y2, ...]
  color: string;
  strokeWidth: number;
  isBezier: boolean;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: number[];
  color: string;
  strokeWidth: number;
  dash: number[];
  isBezier?: boolean;
}

export interface TextAnnotation extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
  color: string;
  strokeWidth: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
  color: string;
  strokeWidth: number;
}

export type AnyShape =
  | CourtShape
  | PlayerShape
  | BallShape
  | TeamLabelShape
  | ArrowShape
  | LineShape
  | TextAnnotation
  | RectShape
  | CircleShape
  | EllipseShape;

// ── Camera ───────────────────────────────────────────────────

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface BoardState {
  shapes: AnyShape[];
  selectedIds: string[];
  camera: Camera;
}

// ── Animation & Project ──────────────────────────────────────

export type AnimFrame = Record<string, { x: number; y: number }>;

export interface SavedAnimation {
  frames: AnimFrame[];
  duration: number;
}

export interface ProjectData {
  version: string;
  board: BoardState;
  animations: Record<string, SavedAnimation>;
  rotations: Record<string, Record<string, Record<string, any>>>; // { A: { S1: {...} }, B: {...} }
  customPresets: Record<string, Record<string, Record<string, any>>>;
}

// ── 名前付き保存プロジェクト ────────────────────────────────
export interface SavedProject {
  name: string;
  shapes: AnyShape[];
  camera: Camera;
  updatedAt: number; // epoch ms
}
