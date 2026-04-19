import { renderHook, act } from '@testing-library/react';
import { useBoard } from '../hooks/useBoard';
import { describe, it, expect } from 'vitest';

describe('useBoard', () => {
  it('should initialize with empty shapes', () => {
    const { result } = renderHook(() => useBoard());
    expect(result.current.shapes).toEqual([]);
  });

  it('should add a shape', () => {
    const { result } = renderHook(() => useBoard());
    const shape = { id: '1', type: 'player' as const, x: 0, y: 0, zIndex: 1, team: 'A' as const, number: '1', name: '', color: '', position: '', isVisible: true, isFree: false, namePosition: 'top' as const };
    act(() => {
      result.current.addShape(shape);
    });
    expect(result.current.shapes).toHaveLength(1);
  });

  it('should undo and redo', () => {
    const { result } = renderHook(() => useBoard());
    const shape = { id: '1', type: 'player' as const, x: 0, y: 0, zIndex: 1, team: 'A' as const, number: '1', name: '', color: '', position: '', isVisible: true, isFree: false, namePosition: 'top' as const };
    act(() => {
      result.current.addShape(shape);
    });
    expect(result.current.shapes).toHaveLength(1);
    act(() => {
      result.current.undo();
    });
    expect(result.current.shapes).toHaveLength(0);
    act(() => {
      result.current.redo();
    });
    expect(result.current.shapes).toHaveLength(1);
  });
});