import { useCallback, useRef, useState } from 'react';
import type { AnyShape, BoardState, Camera } from '../types';

const HISTORY_LIMIT = 50;
const DEFAULT_GRID_SIZE = 26; // 0.5m (SCALE / 2)
const SNAP_SETTINGS_KEY = 'v-tactics-snap-settings-v2';

const initialState: BoardState = {
  shapes: [],
  selectedIds: [],
  camera: { x: 0, y: 0, scale: 1 },
};

interface SnapSettings {
  snapEnabled: boolean;
  gridSize: number;
  showGrid: boolean;
}

const loadSnapSettings = (): SnapSettings => {
  try {
    const raw = localStorage.getItem(SNAP_SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        snapEnabled: !!p.snapEnabled,
        gridSize: typeof p.gridSize === 'number' && p.gridSize > 0 ? p.gridSize : DEFAULT_GRID_SIZE,
        showGrid: !!p.showGrid,
      };
    }
  } catch { /* ignore */ }
  return { snapEnabled: false, gridSize: DEFAULT_GRID_SIZE, showGrid: false };
};

export function useBoard() {
  const [state, setState] = useState<BoardState>(initialState);
  const [snapSettings, setSnapSettings] = useState<SnapSettings>(loadSnapSettings);
  const historyRef = useRef<BoardState[]>([]);
  const futureRef = useRef<BoardState[]>([]);

  const updateSnapSettings = useCallback((updates: Partial<SnapSettings>) => {
    setSnapSettings(cur => {
      const next = { ...cur, ...updates };
      try { localStorage.setItem(SNAP_SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const snap = useCallback((v: number) => {
    if (!snapSettings.snapEnabled) return v;
    return Math.round(v / snapSettings.gridSize) * snapSettings.gridSize;
  }, [snapSettings.snapEnabled, snapSettings.gridSize]);

  // ── 履歴保存（shapes変更時のみ） ──────────────────────────
  const pushHistory = useCallback((prev: BoardState) => {
    historyRef.current = [...historyRef.current.slice(-HISTORY_LIMIT + 1), prev];
    futureRef.current = [];
  }, []);

  // ── Undo / Redo ──────────────────────────────────────────
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setState(cur => {
      futureRef.current = [cur, ...futureRef.current];
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    setState(cur => {
      historyRef.current = [...historyRef.current, cur];
      return next;
    });
  }, []);

  // ── Shape CRUD ───────────────────────────────────────────
  const addShape = useCallback((shape: AnyShape) => {
    setState(cur => {
      pushHistory(cur);
      const maxZ = cur.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
      return { ...cur, shapes: [...cur.shapes, { ...shape, zIndex: maxZ + 1 }] };
    });
  }, [pushHistory]);

  const updateShape = useCallback((id: string, updates: Partial<AnyShape>) => {
    setState(cur => ({
      ...cur,
      shapes: cur.shapes.map(s => s.id === id ? { ...s, ...updates } as AnyShape : s),
    }));
  }, []);

  const updateShapes = useCallback((updates: { id: string; changes: Partial<AnyShape> }[]) => {
    setState(cur => {
      const map = new Map(updates.map(u => [u.id, u.changes]));
      return {
        ...cur,
        shapes: cur.shapes.map(s => map.has(s.id) ? { ...s, ...map.get(s.id) } as AnyShape : s),
      };
    });
  }, []);

  const deleteShape = useCallback((id: string) => {
    setState(cur => {
      pushHistory(cur);
      return { ...cur, shapes: cur.shapes.filter(s => s.id !== id), selectedIds: cur.selectedIds.filter(i => i !== id) };
    });
  }, [pushHistory]);

  const deleteShapes = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setState(cur => {
      pushHistory(cur);
      return { ...cur, shapes: cur.shapes.filter(s => !set.has(s.id)), selectedIds: cur.selectedIds.filter(i => !set.has(i)) };
    });
  }, [pushHistory]);

  const getShape = useCallback((id: string) => {
    return state.shapes.find(s => s.id === id);
  }, [state.shapes]);

  // ── Z-order ──────────────────────────────────────────────
  const bringToFront = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setState(cur => {
      const maxZ = cur.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);
      let z = maxZ + 1;
      return {
        ...cur,
        shapes: cur.shapes.map(s => set.has(s.id) ? { ...s, zIndex: z++ } as AnyShape : s),
      };
    });
  }, []);

  const sendToBack = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setState(cur => {
      const minZ = cur.shapes.reduce((m, s) => Math.min(m, s.zIndex), 0);
      let z = minZ - ids.length;
      return {
        ...cur,
        shapes: cur.shapes.map(s => set.has(s.id) ? { ...s, zIndex: z++ } as AnyShape : s),
      };
    });
  }, []);

  // ── Selection ────────────────────────────────────────────
  const select = useCallback((ids: string[]) => {
    setState(cur => ({ ...cur, selectedIds: ids }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(cur => ({ ...cur, selectedIds: [] }));
  }, []);

  // ── Align ────────────────────────────────────────────────
  const alignShapes = useCallback((ids: string[], direction: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV') => {
    setState(cur => {
      pushHistory(cur);
      const targets = cur.shapes.filter(s => ids.includes(s.id));
      if (targets.length < 2) return cur;
      let ref: number;
      if      (direction === 'left')    ref = Math.min(...targets.map(s => s.x));
      else if (direction === 'right')   ref = Math.max(...targets.map(s => s.x));
      else if (direction === 'top')     ref = Math.min(...targets.map(s => s.y));
      else if (direction === 'bottom')  ref = Math.max(...targets.map(s => s.y));
      else if (direction === 'centerH') ref = targets.reduce((a, s) => a + s.x, 0) / targets.length;
      else                              ref = targets.reduce((a, s) => a + s.y, 0) / targets.length;
      const set = new Set(ids);
      return {
        ...cur,
        shapes: cur.shapes.map(s => {
          if (!set.has(s.id)) return s;
          if (direction === 'left' || direction === 'right' || direction === 'centerH') return { ...s, x: ref } as AnyShape;
          return { ...s, y: ref } as AnyShape;
        }),
      };
    });
  }, [pushHistory]);

  const distributeShapes = useCallback((ids: string[], direction: 'horizontal' | 'vertical') => {
    setState(cur => {
      pushHistory(cur);
      const targets = [...cur.shapes.filter(s => ids.includes(s.id))];
      if (targets.length < 3) return cur;
      if (direction === 'horizontal') {
        targets.sort((a, b) => a.x - b.x);
        const total = targets[targets.length - 1].x - targets[0].x;
        const step = total / (targets.length - 1);
        const startX = targets[0].x;
        const posMap = new Map(targets.map((s, i) => [s.id, startX + step * i]));
        return { ...cur, shapes: cur.shapes.map(s => posMap.has(s.id) ? { ...s, x: posMap.get(s.id)! } as AnyShape : s) };
      } else {
        targets.sort((a, b) => a.y - b.y);
        const total = targets[targets.length - 1].y - targets[0].y;
        const step = total / (targets.length - 1);
        const startY = targets[0].y;
        const posMap = new Map(targets.map((s, i) => [s.id, startY + step * i]));
        return { ...cur, shapes: cur.shapes.map(s => posMap.has(s.id) ? { ...s, y: posMap.get(s.id)! } as AnyShape : s) };
      }
    });
  }, [pushHistory]);

  // ── Camera ───────────────────────────────────────────────
  const setCamera = useCallback((camera: Partial<Camera>) => {
    setState(cur => ({ ...cur, camera: { ...cur.camera, ...camera } }));
  }, []);

  // ── Batch (陣形復元など、履歴に残す) ──────────────────────
  const batchUpdate = useCallback((fn: (shapes: AnyShape[]) => AnyShape[]) => {
    setState(cur => {
      pushHistory(cur);
      return { ...cur, shapes: fn(cur.shapes) };
    });
  }, [pushHistory]);

  return {
    shapes: state.shapes,
    selectedIds: state.selectedIds,
    camera: state.camera,
    // shape ops
    addShape, updateShape, updateShapes, deleteShape, deleteShapes, getShape,
    // z-order
    bringToFront, sendToBack,
    // selection
    select, clearSelection,
    // align
    alignShapes, distributeShapes,
    // camera
    setCamera,
    // history
    undo, redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    // batch
    batchUpdate,
    // snap / grid
    snap,
    snapEnabled: snapSettings.snapEnabled,
    gridSize: snapSettings.gridSize,
    showGrid: snapSettings.showGrid,
    setSnapEnabled: (v: boolean) => updateSnapSettings({ snapEnabled: v }),
    setShowGrid: (v: boolean) => updateSnapSettings({ showGrid: v }),
    setGridSize: (v: number) => updateSnapSettings({ gridSize: v }),
    // raw setState (永続化用)
    setState,
  };
}

export type Board = ReturnType<typeof useBoard>;
