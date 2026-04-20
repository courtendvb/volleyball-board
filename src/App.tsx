import { useEffect, useRef, useState } from 'react';
import { Layer, Line } from 'react-konva';
import Konva from 'konva';
import { useBoard } from './hooks/useBoard';
import { BoardCanvas } from './components/BoardCanvas';
import { ControlPanel } from './components/ControlPanel';
import { RightPanel } from './components/RightPanel';
import { DrawingPanel } from './components/DrawingPanel';
import { AnimationPanel } from './components/AnimationPanel';
import { ProjectSheet } from './components/ProjectSheet';
import { CourtShapeRenderer } from './shapes/CourtShape';
import { PlayerShapeRenderer } from './shapes/PlayerShape';
import { BallShapeRenderer } from './shapes/BallShape';
import { TeamLabelShapeRenderer } from './shapes/TeamLabelShape';
import { ArrowShapeRenderer, LineShapeRenderer } from './shapes/ArrowShape';
import { TextAnnotationRenderer } from './shapes/TextAnnotation';
import { RectShapeRenderer, CircleShapeRenderer, EllipseShapeRenderer } from './shapes/GenericShapes';
import type { AnyShape, ArrowShape, LineShape, PlayerShape, BallShape, TeamLabelShape, TextAnnotation, CourtShape, RectShape, CircleShape, EllipseShape, SavedAnimation, SavedProject } from './types';
import { newId } from './utils/id';
import { calcBasePositions, DEFAULT_ROTATIONS } from './utils/formationUtils';
import { applyThemeMode, getInitialThemeMode, type ThemeMode } from './ui/theme';
import { MobileTabBar, MobileCanvasOverlay, type MobileTab } from './components/MobileUI';
import { useIsMobile } from './hooks/useIsMobile';

type Tool = 'select' | 'arrow' | 'line' | 'text' | 'rect' | 'circle' | 'ellipse';

const STORAGE_KEY = 'v-tactics-board-v2';
const ANIM_STORAGE_KEY = 'v-tactics-animations-v2';
const ROT_STORAGE_KEY = 'v-tactics-rotations-v2';
const PRESET_STORAGE_KEY = 'v-tactics-custom-presets-v2';

const SCALE = 52;
const COURT_W = 9 * SCALE;   // 468
const COURT_H = 18 * SCALE;  // 936
const FREE = 2 * SCALE;      // 104
const COURT_X = 0;
const COURT_Y = 0;
const PR = 35; // player radius (SIZE/2 = 70/2)

const ROLES = ['S', 'OH1', 'MB2', 'OP', 'OH2', 'MB1', 'L'] as const;

export const buildInitialShapes = (): AnyShape[] => {
  const COURT_PROPS = { courtType: 'full', orientation: 'vertical', flipped: false };
  const shapes: AnyShape[] = [];

  const court: CourtShape = {
    id: newId(), type: 'court', x: COURT_X, y: COURT_Y, zIndex: 0,
    courtType: 'full', orientation: 'vertical', flipped: false, showZones: false,
  };
  shapes.push(court);

  const posA = calcBasePositions(COURT_X, COURT_Y, COURT_PROPS, 'A');
  const posB = calcBasePositions(COURT_X, COURT_Y, COURT_PROPS, 'B');

  ROLES.forEach((role, idx) => {
    const pA: PlayerShape = {
      id: newId(), type: 'player', team: 'A',
      x: posA[role]?.x ?? COURT_X + COURT_W / 2 - PR,
      y: posA[role]?.y ?? COURT_Y + COURT_H / 2 - PR,
      zIndex: 10 + idx,
      number: String(idx + 1), name: '', color: role === 'L' ? '#1f2937' : '#ef4444',
      position: role, namePosition: 'bottom',
      isVisible: true, isFree: false, nameColor: role === 'L' ? 'white' : 'black',
    };
    shapes.push(pA);

    const pB: PlayerShape = {
      id: newId(), type: 'player', team: 'B',
      x: posB[role]?.x ?? COURT_X + COURT_W / 2 - PR,
      y: posB[role]?.y ?? COURT_Y + COURT_H / 2 - PR,
      zIndex: 20 + idx,
      number: String(idx + 1), name: '', color: role === 'L' ? '#1f2937' : '#3b82f6',
      position: role, namePosition: 'bottom',
      isVisible: false, isFree: false,
    };
    shapes.push(pB);
  });

  const ball: BallShape = {
    id: newId(), type: 'ball',
    x: COURT_X + COURT_W / 2 - 14,
    y: COURT_Y + COURT_H / 2 - 14,
    zIndex: 100, isVisible: false,
  };
  shapes.push(ball);

  const labelA: TeamLabelShape = {
    id: newId(), type: 'team-label', team: 'A',
    x: COURT_X + COURT_W / 2 - 110, y: COURT_Y + COURT_H * 3 / 4 - 30,
    zIndex: 5, name: 'チームA', color: '#ef4444', isVisible: true,
  };
  const labelB: TeamLabelShape = {
    id: newId(), type: 'team-label', team: 'B',
    x: COURT_X + COURT_W / 2 - 110, y: COURT_Y + COURT_H / 4 - 30,
    zIndex: 5, name: 'チームB', color: '#3b82f6', isVisible: false,
  };
  shapes.push(labelA, labelB);

  return shapes;
};

export const getVisibleLocalBounds = (c: CourtShape) => {
  let vy = -FREE, vh = COURT_H + FREE * 2;
  switch (c.courtType) {
    case 'half':
      if (c.flipped) { vy = -FREE; vh = COURT_H / 2 + FREE + 10; }
      else           { vy = COURT_H / 2 - 10; vh = COURT_H / 2 + FREE + 10; }
      break;
    case 'center':
      vy = COURT_H / 2 - 4 * SCALE - FREE;
      vh = 8 * SCALE + FREE * 2;
      break;
    case 'top35':
      vy = -FREE; vh = 10.8 * SCALE + FREE * 2;
      break;
    case 'bottom35':
      vy = COURT_H - 10.8 * SCALE - FREE; vh = 10.8 * SCALE + FREE * 2;
      break;
  }
  return { vx: -FREE, vy, vw: COURT_W + FREE * 2, vh };
};

export const calcCameraForCourt = (court: CourtShape) => {
  const PAD = 40;
  const isMobile = window.innerWidth < 640;
  const TAB_BAR_H = isMobile ? 60 : 0;
  const availW = window.innerWidth;
  const availH = window.innerHeight - TAB_BAR_H;

  const { vx, vy, vw, vh } = getVisibleLocalBounds(court);
  const isHoriz = court.orientation === 'horizontal';
  const rotationRad = (isHoriz ? -90 : court.flipped ? 180 : 0) * Math.PI / 180;
  const offsetX = isHoriz ? 0 : court.flipped ? COURT_W : 0;
  const offsetY = isHoriz ? COURT_W : court.flipped ? COURT_H : 0;

  const corners: [number, number][] = [
    [vx, vy], [vx + vw, vy], [vx + vw, vy + vh], [vx, vy + vh],
  ];
  const worldCorners = corners.map(([lx, ly]) => {
    const x1 = lx - offsetX;
    const y1 = ly - offsetY;
    return [
      court.x + x1 * Math.cos(rotationRad) - y1 * Math.sin(rotationRad),
      court.y + x1 * Math.sin(rotationRad) + y1 * Math.cos(rotationRad),
    ];
  });

  const wxs = worldCorners.map(c => c[0]);
  const wys = worldCorners.map(c => c[1]);
  const wMinX = Math.min(...wxs), wMaxX = Math.max(...wxs);
  const wMinY = Math.min(...wys), wMaxY = Math.max(...wys);
  const worldW = wMaxX - wMinX;
  const worldH = wMaxY - wMinY;

  const scale = Math.min(
    (availW - PAD * 2) / worldW,
    (availH - PAD * 2) / worldH,
  );
  return {
    scale,
    x: (availW - worldW * scale) / 2 - wMinX * scale,
    y: (availH - worldH * scale) / 2 - wMinY * scale,
  };
};

export const calcInitialCamera = () => {
  const PAD = 40;
  const isMobile = window.innerWidth < 640;
  const TAB_BAR_H = isMobile ? 60 : 0;
  const totalW = COURT_W + FREE * 2;
  const totalH = COURT_H + FREE * 2;
  const availH = window.innerHeight - TAB_BAR_H;
  const scale = Math.min(
    (window.innerWidth - PAD * 2) / totalW,
    (availH - PAD * 2) / totalH,
  );
  return {
    scale,
    x: (window.innerWidth - totalW * scale) / 2 + FREE * scale,
    y: (availH - totalH * scale) / 2 + FREE * scale,
  };
};

export default function App() {
  const board = useBoard();
  const stageRef = useRef<Konva.Stage | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawBezier, setDrawBezier] = useState(false);
  const [drawDash, setDrawDash] = useState(false);
  const [fontFamily, setFontFamily] = useState("'Zen Maru Gothic', sans-serif");
  const [textFontSize, setTextFontSize] = useState(24);

  // Centralized project data states
  const [_savedAnimations, setSavedAnimations] = useState<Record<string, SavedAnimation>>({});
  const [_rotations, setRotations] = useState<Record<string, Record<string, Record<string, any>>>>(DEFAULT_ROTATIONS);
  const [_customPresets, setCustomPresets] = useState<Record<string, Record<string, Record<string, any>>>>({ A: {}, B: {} });

  // Bezier waypoint state
  const [bezierWaypoints, setBezierWaypoints] = useState<number[]>([]);
  const bezierWaypointsRef = useRef<number[]>([]);
  const [bezierPreviewPos, setBezierPreviewPos] = useState<{ x: number; y: number } | null>(null);

  // Text input state
  const [textInput, setTextInput] = useState<{ wx: number; wy: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  // Drawing state (non-bezier)
  const [drawPoints, setDrawPoints] = useState<number[]>([]);
  const drawPointsRef = useRef<number[]>([]);
  const isDrawingRef = useRef(false);
  const MIN_DRAW_DIST = 5;
  const resetAnimRafRef = useRef<number | null>(null);

  // Project sheet (named multi-slot save)
  const [projectsOpen, setProjectsOpen] = useState(false);

  // Mobile tab navigation
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');
  const isMobile = useIsMobile();

  // Theme mode
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  useEffect(() => { applyThemeMode(themeMode); }, [themeMode]);

  useEffect(() => {
    // 1. URL hash share link takes priority
    const hash = window.location.hash;
    if (hash.startsWith('#board=')) {
      try {
        const encoded = hash.slice(7);
        const state = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        board.setState({ shapes: state.shapes, selectedIds: [], camera: state.camera });
        window.history.replaceState(null, '', window.location.pathname);
        return;
      } catch { /* fallthrough */ }
    }

    // 2. Board state from localStorage
    const savedBoard = localStorage.getItem(STORAGE_KEY);
    if (savedBoard) {
      try {
        board.setState(JSON.parse(savedBoard));
      } catch { /* ignore */ }
    } else {
      const shapes = buildInitialShapes();
      const camera = calcInitialCamera();
      board.setState({ shapes, selectedIds: [], camera });
    }

    // 2. Animations
    const savedAnims = localStorage.getItem(ANIM_STORAGE_KEY);
    if (savedAnims) {
      try { setSavedAnimations(JSON.parse(savedAnims)); } catch { /* ignore */ }
    }

    // 3. Formations
    const savedRots = localStorage.getItem(ROT_STORAGE_KEY);
    if (savedRots) {
      try {
        const parsed = JSON.parse(savedRots);
        setRotations({
          A: { ...DEFAULT_ROTATIONS.A, ...(parsed.A ?? {}) },
          B: { ...DEFAULT_ROTATIONS.B, ...(parsed.B ?? {}) },
        });
      } catch { /* ignore */ }
    }
    const savedPresets = localStorage.getItem(PRESET_STORAGE_KEY);
    if (savedPresets) {
      try { setCustomPresets(JSON.parse(savedPresets)); } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save board state to localStorage ────────────────
  useEffect(() => {
    // shapes が空の場合は初期化前なので保存しない
    if (board.shapes.length === 0) return;
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        shapes: board.shapes,
        selectedIds: board.selectedIds,
        camera: board.camera,
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [board.shapes, board.selectedIds, board.camera]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && board.selectedIds.length > 0) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        board.deleteShapes(board.selectedIds);
      }
      if (e.key === 'Escape') {
        setDrawPoints([]);
        drawPointsRef.current = [];
        isDrawingRef.current = false;
        setBezierWaypoints([]);
        bezierWaypointsRef.current = [];
        setBezierPreviewPos(null);
        setTextInput(null);
        setTextInputValue('');
        setTool('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board]);

  // ── Bezier handlers ───────────────────────────────────────
  const handleBezierPoint = (wx: number, wy: number) => {
    const newPts = [...bezierWaypointsRef.current, wx, wy];
    bezierWaypointsRef.current = newPts;
    setBezierWaypoints(newPts);
  };

  const handleBezierPreview = (wx: number, wy: number) => {
    setBezierPreviewPos({ x: wx, y: wy });
  };

  const handleFinishBezier = () => {
    const pts = bezierWaypointsRef.current;
    if (pts.length < 4) return;
    const maxZ = board.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
    if (tool === 'arrow') {
      const shape: ArrowShape = {
        id: newId(), type: 'arrow', x: 0, y: 0, zIndex: maxZ + 1,
        points: pts, color: drawColor, strokeWidth: drawWidth, isBezier: true,
      };
      board.addShape(shape);
    } else {
      const shape: LineShape = {
        id: newId(), type: 'line', x: 0, y: 0, zIndex: maxZ + 1,
        points: pts, color: drawColor, strokeWidth: drawWidth,
        dash: drawDash ? [8, 6] : [],
        isBezier: true,
      };
      board.addShape(shape);
    }
    bezierWaypointsRef.current = [];
    setBezierWaypoints([]);
    setBezierPreviewPos(null);
  };

  // ── Drawing handlers (non-bezier) ────────────────────────
  const handleDrawStart = (wx: number, wy: number) => {
    isDrawingRef.current = true;
    drawPointsRef.current = [wx, wy];
    setDrawPoints([wx, wy]);
  };

  const handleDrawMove = (wx: number, wy: number) => {
    if (!isDrawingRef.current) return;
    const current = drawPointsRef.current;
    const pts = [current[0], current[1], wx, wy];
    drawPointsRef.current = pts;
    setDrawPoints(pts);
  };

  const handleDrawEnd = (wx: number, wy: number) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const current = drawPointsRef.current;
    const finalPts = [current[0], current[1], wx, wy];
    drawPointsRef.current = [];
    setDrawPoints([]);

    if (finalPts.length < 4) return;
    const dx = finalPts[finalPts.length - 2] - finalPts[0];
    const dy = finalPts[finalPts.length - 1] - finalPts[1];
    if (Math.sqrt(dx * dx + dy * dy) < MIN_DRAW_DIST) return;

    const maxZ = board.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
    if (tool === 'arrow') {
      const shape: ArrowShape = {
        id: newId(), type: 'arrow', x: 0, y: 0, zIndex: maxZ + 1,
        points: finalPts, color: drawColor, strokeWidth: drawWidth, isBezier: false,
      };
      board.addShape(shape);
    } else if (tool === 'rect') {
      const startX = finalPts[0]; const startY = finalPts[1];
      const endX = finalPts[2]; const endY = finalPts[3];
      const shape: RectShape = {
        id: newId(), type: 'rect', zIndex: maxZ + 1,
        x: Math.min(startX, endX), y: Math.min(startY, endY),
        width: Math.abs(endX - startX), height: Math.abs(endY - startY),
        color: drawColor, strokeWidth: drawWidth,
      };
      board.addShape(shape);
    } else if (tool === 'circle') {
      const startX = finalPts[0]; const startY = finalPts[1];
      const endX = finalPts[2]; const endY = finalPts[3];
      const shape: CircleShape = {
        id: newId(), type: 'circle', zIndex: maxZ + 1,
        x: startX, y: startY,
        radius: Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)),
        color: drawColor, strokeWidth: drawWidth,
      };
      board.addShape(shape);
    } else if (tool === 'ellipse') {
      const cx = (finalPts[0] + finalPts[2]) / 2;
      const cy = (finalPts[1] + finalPts[3]) / 2;
      const shape: EllipseShape = {
        id: newId(), type: 'ellipse', zIndex: maxZ + 1,
        x: cx, y: cy,
        radiusX: Math.abs(finalPts[2] - finalPts[0]) / 2,
        radiusY: Math.abs(finalPts[3] - finalPts[1]) / 2,
        color: drawColor, strokeWidth: drawWidth,
      };
      board.addShape(shape);
    } else {
      const shape: LineShape = {
        id: newId(), type: 'line', x: 0, y: 0, zIndex: maxZ + 1,
        points: finalPts, color: drawColor, strokeWidth: drawWidth,
        dash: drawDash ? [8, 6] : [],
        isBezier: false,
      };
      board.addShape(shape);
    }
  };

  // ── Canvas click (text tool) ─────────────────────────────
  const handleCanvasClick = (wx: number, wy: number) => {
    if (tool === 'text') {
      setTextInput({ wx, wy });
      setTextInputValue('');
    }
  };

  const handleTextCommit = () => {
    if (!textInput || !textInputValue.trim()) {
      setTextInput(null);
      setTextInputValue('');
      return;
    }
    const maxZ = board.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
    const shape: TextAnnotation = {
      id: newId(), type: 'text',
      x: textInput.wx, y: textInput.wy,
      zIndex: maxZ + 1,
      text: textInputValue,
      fontSize: textFontSize,
      color: drawColor,
    };
    board.addShape(shape);
    setTextInput(null);
    setTextInputValue('');
  };

  // ── Add shapes ───────────────────────────────────────────
  const handleAddPlayer = (team: 'A' | 'B') => {
    const existing = board.shapes.filter(s => s.type === 'player' && (s as PlayerShape).team === team) as PlayerShape[];
    const maxNum = existing.reduce((m, p) => Math.max(m, parseInt(p.number) || 0), 0);
    const color = team === 'A'
      ? (existing[0]?.color ?? '#ef4444')
      : (existing[0]?.color ?? '#3b82f6');
    const maxZ = board.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
    const shape: PlayerShape = {
      id: newId(), type: 'player', team,
      x: COURT_X + COURT_W / 2 - PR,
      y: COURT_Y + COURT_H / 2 - PR,
      zIndex: maxZ + 1,
      number: String(maxNum + 1), name: '', color, position: '',
      namePosition: team === 'A' ? 'bottom' : 'top',
      isVisible: team === 'A', isFree: false,
      nameColor: 'black',
    };
    board.addShape(shape);
    board.select([shape.id]);
  };

  const handleAddBall = () => {
    const maxZ = board.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
    const shape: BallShape = {
      id: newId(), type: 'ball',
      x: COURT_X + COURT_W / 2 - 14,
      y: COURT_Y + COURT_H / 2 - 14,
      zIndex: maxZ + 1,
      isVisible: true,
    };
    board.addShape(shape);
  };

  const handleResetPositions = () => {
    const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;
    if (!court) return;

    const teamAPlayers = board.shapes.filter(s => s.type === 'player' && (s as PlayerShape).team === 'A') as PlayerShape[];
    const teamBPlayers = board.shapes.filter(s => s.type === 'player' && (s as PlayerShape).team === 'B') as PlayerShape[];

    const posA = calcBasePositions(court.x, court.y, court, 'A');
    const posB = calcBasePositions(court.x, court.y, court, 'B');

    const updates: { id: string; startX: number; startY: number; endX: number; endY: number }[] = [];

    const ROLES = ['S', 'OH1', 'MB2', 'OP', 'OH2', 'MB1', 'L'];

    // Team A mapping
    const sortedA = [...teamAPlayers].sort((a, b) => parseInt(a.number) - parseInt(b.number));
    ROLES.forEach((role, idx) => {
      const player = sortedA[idx];
      if (player && posA[role]) {
        updates.push({ id: player.id, startX: player.x, startY: player.y, endX: posA[role].x, endY: posA[role].y });
      }
    });

    // Team B mapping
    const sortedB = [...teamBPlayers].sort((a, b) => parseInt(a.number) - parseInt(b.number));
    ROLES.forEach((role, idx) => {
      const player = sortedB[idx];
      if (player && posB[role]) {
        updates.push({ id: player.id, startX: player.x, startY: player.y, endX: posB[role].x, endY: posB[role].y });
      }
    });

    if (updates.length > 0) {
      const duration = 600; const t0 = Date.now();
      if (resetAnimRafRef.current !== null) cancelAnimationFrame(resetAnimRafRef.current);
      const step = () => {
        const p = Math.min((Date.now() - t0) / duration, 1); const e = p * (2 - p);
        board.updateShapes(updates.map(u => ({ id: u.id, changes: { x: u.startX + (u.endX - u.startX) * e, y: u.startY + (u.endY - u.startY) * e } })));
        if (p < 1) { resetAnimRafRef.current = requestAnimationFrame(step); } else { resetAnimRafRef.current = null; }
      };
      resetAnimRafRef.current = requestAnimationFrame(step);
    }
  };

  // ── Actions ──────────────────────────────────────────────
  const handleClearDrawings = () => {
    const ids = board.shapes
      .filter(s => s.type === 'arrow' || s.type === 'line' || s.type === 'text' || s.type === 'rect' || s.type === 'circle' || s.type === 'ellipse')
      .map(s => s.id);
    if (ids.length > 0) board.deleteShapes(ids);
  };

  const handleFitToCourt = () => {
    const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;
    if (!court) return;
    board.setCamera(calcCameraForCourt(court));
  };

  const handleResetAll = () => {
    const slotPlayers = board.shapes.filter(
      s => s.type === 'player' && (s as PlayerShape).slot
    ) as PlayerShape[];

    if (slotPlayers.length > 0) {
      // CSV読み込み済み: スロットベースで初期位置にアニメーション
      const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;
      if (!court) return;
      const updates: { id: string; sx: number; sy: number; ex: number; ey: number }[] = [];
      (['A', 'B'] as const).forEach(team => {
        const posMap = calcBasePositions(court.x, court.y, court, team);
        slotPlayers.filter(p => p.team === team).forEach(p => {
          const pos = p.slot ? posMap[p.slot] : undefined;
          if (pos) updates.push({ id: p.id, sx: p.x, sy: p.y, ex: pos.x, ey: pos.y });
        });
      });
      const duration = 500; const t0 = Date.now();
      const step = () => {
        const prog = Math.min((Date.now() - t0) / duration, 1);
        const ease = prog * (2 - prog);
        board.updateShapes(updates.map(u => ({
          id: u.id,
          changes: { x: u.sx + (u.ex - u.sx) * ease, y: u.sy + (u.ey - u.sy) * ease },
        })));
        if (prog < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else {
      if (!confirm('全てをデフォルトに戻しますか？\n（保存済みプロジェクトは維持されます）')) return;
      const shapes = buildInitialShapes();
      const camera = calcInitialCamera();
      board.setState({ shapes, selectedIds: [], camera });
    }
  };

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;

    let exportOpts: any = { pixelRatio: 2 };

    if (court) {
      const { vx, vy, vw, vh } = getVisibleLocalBounds(court);
      const isHoriz = court.orientation === 'horizontal';
      const rotationRad = (isHoriz ? -90 : court.flipped ? 180 : 0) * Math.PI / 180;
      const offsetX = isHoriz ? 0 : court.flipped ? COURT_W : 0;
      const offsetY = isHoriz ? COURT_W : court.flipped ? COURT_H : 0;

      const corners = [
        [vx, vy], [vx + vw, vy], [vx + vw, vy + vh], [vx, vy + vh],
      ];

      const worldCorners = corners.map(([lx, ly]) => {
        const x1 = lx - offsetX;
        const y1 = ly - offsetY;
        return [
          court.x + x1 * Math.cos(rotationRad) - y1 * Math.sin(rotationRad),
          court.y + x1 * Math.sin(rotationRad) + y1 * Math.cos(rotationRad),
        ];
      });

      const wxs = worldCorners.map(c => c[0]);
      const wys = worldCorners.map(c => c[1]);
      const wMinX = Math.min(...wxs), wMaxX = Math.max(...wxs);
      const wMinY = Math.min(...wys), wMaxY = Math.max(...wys);

      // ワールド座標 → スクリーン座標
      const cam = board.camera;
      const sx = wMinX * cam.scale + cam.x;
      const sy = wMinY * cam.scale + cam.y;
      const sw = (wMaxX - wMinX) * cam.scale;
      const sh = (wMaxY - wMinY) * cam.scale;

      // pixelRatio でズーム倍率を打ち消し、コート本来の解像度 ×2 で書き出す
      const pixelRatio = Math.min(4, Math.max(1, 2 / cam.scale));

      exportOpts = { x: sx, y: sy, width: sw, height: sh, pixelRatio };
    }

    const dataURL = stage.toDataURL(exportOpts);
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice) {
      const w = window.open();
      if (w) {
        w.document.write(`<img src="${dataURL}" style="max-width:100%" /><p style="font-family:sans-serif;color:#555">長押しして「写真に保存」または「画像を保存」</p>`);
      }
    } else {
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = 'volleyball-board.png';
      a.click();
    }
  };

  const handleLoadProject = (p: SavedProject) => {
    board.setState({ shapes: p.shapes, selectedIds: [], camera: p.camera });
  };

  const handleShareLink = () => {
    const state = { shapes: board.shapes, camera: board.camera };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    const url = `${window.location.origin}${window.location.pathname}#board=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('シェアリンクをクリップボードにコピーしました');
    }).catch(() => {
      prompt('以下のURLをコピーしてください:', url);
    });
  };

  // ── Drawing preview ──────────────────────────────────────
  const previewArrowHead = (pts: number[]) => {
    if (pts.length < 4) return null;
    const lastX = pts[pts.length - 2];
    const lastY = pts[pts.length - 1];
    const prevX = pts[pts.length - 4];
    const prevY = pts[pts.length - 3];
    const angle = Math.atan2(lastY - prevY, lastX - prevX);
    const sz = 14;
    return [
      lastX - sz * Math.cos(angle - Math.PI / 6),
      lastY - sz * Math.sin(angle - Math.PI / 6),
      lastX, lastY,
      lastX - sz * Math.cos(angle + Math.PI / 6),
      lastY - sz * Math.sin(angle + Math.PI / 6),
    ];
  };

  // Bezier preview points (waypoints + preview cursor)
  const bezierPreviewPoints = (() => {
    if (bezierWaypoints.length < 2) return null;
    if (!bezierPreviewPos) return bezierWaypoints;
    return [...bezierWaypoints, bezierPreviewPos.x, bezierPreviewPos.y];
  })();

  const sorted = [...board.shapes].sort((a, b) => a.zIndex - b.zIndex);

  // Text overlay screen position
  const textOverlayPos = textInput ? {
    left: textInput.wx * board.camera.scale + board.camera.x,
    top: textInput.wy * board.camera.scale + board.camera.y,
  } : null;

  return (
    <>
      <BoardCanvas
        board={board}
        tool={tool}
        stageRef={stageRef}
        onDrawStart={!drawBezier ? handleDrawStart : undefined}
        onDrawMove={!drawBezier ? handleDrawMove : undefined}
        onDrawEnd={!drawBezier ? handleDrawEnd : undefined}
        drawBezier={drawBezier}
        onBezierPoint={handleBezierPoint}
        onBezierPreview={handleBezierPreview}
        onCanvasClick={handleCanvasClick}
        onFinishBezier={handleFinishBezier}
      >
        <Layer>
          {sorted.map(shape => {
            const isSelected = board.selectedIds.includes(shape.id);
            const showTransformer = isSelected && board.selectedIds.length === 1;
            switch (shape.type) {
              case 'court':
                return <CourtShapeRenderer key={shape.id} shape={shape} />;
              case 'player':
                return <PlayerShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} fontFamily={fontFamily} isSelectTool={tool === 'select'} />;
              case 'ball':
                return <BallShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} />;
              case 'team-label':
                return <TeamLabelShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} fontFamily={fontFamily} />;
              case 'arrow':
                return <ArrowShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} />;
              case 'line':
                return <LineShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} />;
              case 'text':
                return <TextAnnotationRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} />;
              case 'rect':
                return <RectShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} showTransformer={showTransformer} />;
              case 'circle':
                return <CircleShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} />;
              case 'ellipse':
                return <EllipseShapeRenderer key={shape.id} shape={shape} board={board} isSelected={isSelected} showTransformer={showTransformer} />;
              default:
                return null;
            }
          })}

          {/* Non-bezier drawing preview */}
          {drawPoints.length >= 4 && !drawBezier && (
            <>
              {tool === 'arrow' && (() => {
                const arrowPts = previewArrowHead(drawPoints);
                return (
                  <>
                    <Line points={drawPoints} stroke={drawColor} strokeWidth={drawWidth}
                      tension={0} opacity={0.7} lineCap='round' lineJoin='round' listening={false} />
                    {arrowPts && (
                      <Line points={arrowPts} stroke={drawColor} strokeWidth={drawWidth}
                        opacity={0.7} lineCap='round' lineJoin='round' listening={false} />
                    )}
                  </>
                );
              })()}
              {tool === 'line' && (
                <Line
                  points={drawPoints}
                  stroke={drawColor}
                  strokeWidth={drawWidth}
                  tension={0}
                  dash={drawDash ? [8, 6] : undefined}
                  opacity={0.7} lineCap='round' listening={false}
                />
              )}
              {tool === 'rect' && (
                <Line
                  points={[
                    drawPoints[0], drawPoints[1],
                    drawPoints[2], drawPoints[1],
                    drawPoints[2], drawPoints[3],
                    drawPoints[0], drawPoints[3],
                    drawPoints[0], drawPoints[1]
                  ]}
                  stroke={drawColor} strokeWidth={drawWidth}
                  fill={drawColor} opacity={0.3} listening={false}
                />
              )}
              {tool === 'circle' && (
                <Line
                  points={(() => {
                    const r = Math.sqrt(Math.pow(drawPoints[2] - drawPoints[0], 2) + Math.pow(drawPoints[3] - drawPoints[1], 2));
                    const pts = [];
                    for(let i=0; i<=32; i++){
                      pts.push(drawPoints[0] + r*Math.cos(i*2*Math.PI/32));
                      pts.push(drawPoints[1] + r*Math.sin(i*2*Math.PI/32));
                    }
                    return pts;
                  })()}
                  stroke={drawColor} strokeWidth={drawWidth}
                  fill={drawColor} opacity={0.3} listening={false} tension={0.2} closed
                />
              )}
              {tool === 'ellipse' && (
                <Line
                  points={(() => {
                    const cx = (drawPoints[0] + drawPoints[2]) / 2;
                    const cy = (drawPoints[1] + drawPoints[3]) / 2;
                    const rx = Math.abs(drawPoints[2] - drawPoints[0]) / 2;
                    const ry = Math.abs(drawPoints[3] - drawPoints[1]) / 2;
                    const pts = [];
                    for (let i = 0; i <= 32; i++) {
                      pts.push(cx + rx * Math.cos(i * 2 * Math.PI / 32));
                      pts.push(cy + ry * Math.sin(i * 2 * Math.PI / 32));
                    }
                    return pts;
                  })()}
                  stroke={drawColor} strokeWidth={drawWidth}
                  fill={drawColor} opacity={0.3} listening={false} tension={0} closed
                />
              )}
            </>
          )}

          {/* Bezier waypoint preview */}
          {bezierPreviewPoints && bezierPreviewPoints.length >= 4 && (
            <>
              <Line
                points={bezierPreviewPoints}
                stroke={drawColor}
                strokeWidth={drawWidth}
                tension={0.3}
                opacity={0.7}
                lineCap='round' lineJoin='round' listening={false}
                dash={bezierPreviewPos ? [6, 4] : undefined}
              />
              {tool === 'arrow' && (() => {
                const arrowPts = previewArrowHead(bezierPreviewPoints);
                return arrowPts ? (
                  <Line points={arrowPts} stroke={drawColor} strokeWidth={drawWidth}
                    opacity={0.7} lineCap='round' lineJoin='round' listening={false} />
                ) : null;
              })()}
            </>
          )}
        </Layer>
      </BoardCanvas>

      <ControlPanel
        board={board}
        onAddBall={handleAddBall}
        onResetPositions={handleResetPositions}
        onResetAll={handleResetAll}
        onExport={handleExport}
        onOpenProjects={() => setProjectsOpen(true)}
        onShareLink={handleShareLink}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode(m => m === 'light' ? 'dark' : 'light')}
        mobileVisible={!isMobile || mobileTab === 'control'}
        onCourtChange={(newCourt) => board.setCamera(calcCameraForCourt(newCourt))}
        onFitToCourt={handleFitToCourt}
      />

      <ProjectSheet
        isOpen={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        currentShapes={board.shapes}
        currentCamera={board.camera}
        onLoad={handleLoadProject}
      />

      <DrawingPanel
        tool={tool}
        setTool={setTool}
        drawColor={drawColor}
        setDrawColor={setDrawColor}
        drawWidth={drawWidth}
        setDrawWidth={setDrawWidth}
        drawDash={drawDash}
        setDrawDash={setDrawDash}
        drawBezier={drawBezier}
        setDrawBezier={setDrawBezier}
        onClearDrawings={handleClearDrawings}
        textFontSize={textFontSize}
        setTextFontSize={setTextFontSize}
        mobileVisible={!isMobile || mobileTab === 'draw'}
      />

      <AnimationPanel board={board} mobileVisible={!isMobile || mobileTab === 'anim'} stageRef={stageRef} />

      <RightPanel board={board} fontFamily={fontFamily} setFontFamily={setFontFamily} mobileVisible={!isMobile || mobileTab === 'players'} onAddPlayer={handleAddPlayer} />

      {isMobile && <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />}
      {isMobile && mobileTab === 'canvas' && (
        <MobileCanvasOverlay board={board} onFitToCourt={handleFitToCourt} />
      )}

      {/* Text input overlay */}
      {textInput && textOverlayPos && (
        <textarea
          autoFocus
          value={textInputValue}
          onChange={e => setTextInputValue(e.target.value)}
          onBlur={handleTextCommit}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextCommit(); }
            if (e.key === 'Escape') { setTextInput(null); setTextInputValue(''); }
          }}
          style={{
            position: 'fixed',
            left: textOverlayPos.left,
            top: textOverlayPos.top,
            zIndex: 200,
            background: 'var(--color-surface-solid)',
            border: '2px solid #3b82f6',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 16,
            color: drawColor,
            fontWeight: 'bold',
            minWidth: 120,
            outline: 'none',
            resize: 'none',
            rows: 2,
          } as React.CSSProperties}
          rows={2}
          placeholder='テキストを入力...'
        />
      )}
    </>
  );
}
