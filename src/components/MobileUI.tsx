import React, { useState } from 'react';
import { theme, panelSurface } from '../ui/theme';
import type { Board } from '../hooks/useBoard';

export type MobileTab = 'canvas' | 'control' | 'players' | 'draw' | 'anim';

const TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'canvas',  icon: 'fa-solid fa-volleyball', label: 'コート' },
  { id: 'control', icon: 'fa-solid fa-sliders',    label: '設定' },
  { id: 'players', icon: 'fa-solid fa-users',      label: '選手' },
  { id: 'draw',    icon: 'fa-solid fa-pencil',     label: '描画' },
  { id: 'anim',    icon: 'fa-solid fa-film',       label: 'アニメ' },
];

interface Props {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export const MobileTabBar = ({ activeTab, onTabChange }: Props) => {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      display: 'flex',
      background: theme.color.surfaceSolid,
      borderTop: `1px solid ${theme.color.border}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
    }}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 0 6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isActive ? theme.color.accent : theme.color.textMuted,
              transition: theme.transition,
            }}
          >
            <i className={tab.icon} style={{
              fontSize: 18,
              transition: theme.transition,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
            }} />
            <span style={{
              fontSize: 9.5,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                width: 24,
                height: 2.5,
                borderRadius: 2,
                background: theme.color.accent,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
};

// ── BottomSheet wrapper for mobile panels ──────────────────
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;
}

export const MobileBottomSheet = ({ isOpen, onClose, children, title, maxHeight = '70vh' }: BottomSheetProps) => {
  const [startY, setStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-scrollable]')) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) setDragOffset(dy);
  };

  const handleTouchEnd = () => {
    if (dragOffset > 100) {
      onClose();
    }
    setDragOffset(0);
    setIsDragging(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: `rgba(15, 23, 42, ${Math.max(0, 0.3 - dragOffset / 600)})`,
        transition: isDragging ? 'none' : 'background 200ms ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute',
          bottom: 'calc(52px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          maxHeight,
          background: theme.color.surfaceSolid,
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'mobile-sheet-up 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: 'flex', justifyContent: 'center', padding: '10px 0 6px',
          cursor: 'grab',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: theme.color.borderStrong,
          }} />
        </div>

        {title && (
          <div style={{
            padding: '0 16px 10px',
            fontSize: 14, fontWeight: 700, color: theme.color.text,
            borderBottom: `1px solid ${theme.color.border}`,
          }}>
            {title}
          </div>
        )}

        <div data-scrollable style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px 16px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Canvas overlay: undo/redo/fit (モバイルcanvasタブ用) ─────────
interface CanvasOverlayProps {
  board: Board;
  onFitToCourt: () => void;
}

const overlayBtnStyle = (disabled?: boolean): React.CSSProperties => ({
  ...panelSurface,
  width: 40, height: 40,
  borderRadius: theme.radius.lg,
  border: `1px solid ${theme.color.border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 15, cursor: disabled ? 'default' : 'pointer',
  color: disabled ? theme.color.textMuted : theme.color.text,
  opacity: disabled ? 0.45 : 1,
  background: theme.color.surfaceSolid,
});

export const MobileCanvasOverlay = ({ board, onFitToCourt }: CanvasOverlayProps) => (
  <div style={{
    position: 'fixed', top: 16, right: 16, zIndex: 150,
    display: 'flex', gap: 6,
  }}>
    <button
      onClick={board.undo}
      disabled={!board.canUndo}
      style={overlayBtnStyle(!board.canUndo)}
      title='元に戻す'
    >
      <i className='fa-solid fa-rotate-left' />
    </button>
    <button
      onClick={board.redo}
      disabled={!board.canRedo}
      style={overlayBtnStyle(!board.canRedo)}
      title='やり直し'
    >
      <i className='fa-solid fa-rotate-right' />
    </button>
    <button
      onClick={onFitToCourt}
      style={overlayBtnStyle()}
      title='コートに合わせる'
    >
      <i className='fa-solid fa-expand' />
    </button>
  </div>
);
