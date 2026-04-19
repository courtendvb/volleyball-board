import { useState } from 'react';
import type { Board } from '../hooks/useBoard';
import type { CourtShape, TeamLabelShape } from '../types';
import { applyCourtTransform } from '../utils/formationUtils';
import { theme, panelSurface, type ThemeMode } from '../ui/theme';
import { Button, IconButton } from '../ui/Button';
import { SectionLabel, Divider, Select } from '../ui/Panel';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props {
  board: Board;
  onAddBall: () => void;
  onResetPositions: () => void;
  onResetAll: () => void;
  onExport: () => void;
  onOpenProjects: () => void;
  onShareLink: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  mobileVisible?: boolean;
  onCourtChange?: (court: CourtShape) => void;
  onFitToCourt?: () => void;
}

export const ControlPanel = ({
  board, onAddBall, onResetPositions, onResetAll, onExport, onOpenProjects, onShareLink,
  themeMode, onToggleTheme, mobileVisible, onCourtChange, onFitToCourt,
}: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const hidden = isMobile && !mobileVisible;

  const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;

  const updateCourt = (updates: Partial<CourtShape>) => {
    if (!court) return;
    board.updateShape(court.id, updates);

    const newCourt = { ...court, ...updates } as CourtShape;
    const isHoriz = newCourt.orientation === 'horizontal';
    const { flipped, courtType } = newCourt;
    const LABEL_W = 220;
    const LABEL_H = 60;
    const PHYS_X = 0;
    const PHYS_DIST = 234;

    const calcPos = (team: 'A' | 'B') => {
      let isBottom: boolean;
      if      (courtType === 'top35')    isBottom = false;
      else if (courtType === 'bottom35') isBottom = true;
      else if (courtType === 'half')     isBottom = !flipped;
      else                               isBottom = team === 'A' ? !flipped : flipped;
      const physY = isBottom ? PHYS_DIST : -PHYS_DIST;
      const { worldX, worldY } = applyCourtTransform(PHYS_X, physY, court.x, court.y, isHoriz, flipped);
      return { x: worldX - LABEL_W / 2, y: worldY - LABEL_H / 2 };
    };

    const labelA = board.shapes.find(s => s.type === 'team-label' && (s as TeamLabelShape).team === 'A');
    const labelB = board.shapes.find(s => s.type === 'team-label' && (s as TeamLabelShape).team === 'B');
    if (labelA) board.updateShape(labelA.id, calcPos('A'));
    if (labelB) board.updateShape(labelB.id, calcPos('B'));

    onCourtChange?.(newCourt);
  };

  if (collapsed && !isMobile) {
    return (
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            ...panelSurface,
            width: 42, height: 42, borderRadius: theme.radius.lg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: theme.color.text, fontSize: 16, border: `1px solid ${theme.color.border}`,
          }}
          title='パネルを開く'
        >
          <i className='fa-solid fa-sliders' />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      ...panelSurface,
      position: 'fixed',
      top: isMobile ? 'auto' : 16,
      bottom: isMobile ? 'calc(52px + env(safe-area-inset-bottom, 0px))' : 'auto',
      left: isMobile ? 0 : 16,
      width: isMobile ? '100%' : 240,
      maxHeight: isMobile ? '42vh' : 'calc(100vh - 32px)',
      borderRadius: isMobile ? '18px 18px 0 0' : theme.radius.xl,
      padding: 14,
      overflowY: 'auto',
      zIndex: 100,
      color: theme.color.text,
      boxSizing: 'border-box',
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: theme.color.text }}>
          コントロール
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={board.undo} disabled={!board.canUndo} title='元に戻す (Ctrl+Z)'>
            <i className='fa-solid fa-rotate-left' />
          </IconButton>
          <IconButton onClick={board.redo} disabled={!board.canRedo} title='やり直し (Ctrl+Y)'>
            <i className='fa-solid fa-rotate-right' />
          </IconButton>
          <IconButton onClick={onToggleTheme} title={themeMode === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}>
            <i className={themeMode === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} />
          </IconButton>
          <IconButton onClick={onResetAll} title='全てをデフォルトに戻す' style={{ color: theme.color.danger }}>
            <i className='fa-regular fa-file' />
          </IconButton>
          {!isMobile && (
            <IconButton onClick={() => setCollapsed(true)} title='閉じる'>
              <i className='fa-solid fa-xmark' />
            </IconButton>
          )}
        </div>
      </div>

      <Divider />

      <div>
        <SectionLabel>コート</SectionLabel>
        {court && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            <Select
              value={`${court.courtType}-${court.orientation}`}
              onChange={v => {
                const [type, ori] = v.split('-');
                if (['full', 'half', 'center', 'top35', 'bottom35'].includes(type) && ['vertical', 'horizontal'].includes(ori)) {
                  updateCourt({ courtType: type as CourtShape['courtType'], orientation: ori as CourtShape['orientation'] });
                }
              }}
            >
              <optgroup label='縦向き（通常）'>
                <option value='full-vertical'>全面</option>
                <option value='half-vertical'>半面</option>
                <option value='center-vertical'>センターエリア</option>
                <option value='bottom35-vertical'>手前 3/5</option>
                <option value='top35-vertical'>奥 3/5</option>
              </optgroup>
              <optgroup label='横向き'>
                <option value='full-horizontal'>全面（横方向）</option>
                <option value='half-horizontal'>半面（横方向）</option>
                <option value='center-horizontal'>センターエリア（横方向）</option>
              </optgroup>
            </Select>

            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.color.textSecondary, cursor: 'pointer', flex: 1 }}>
                <input type='checkbox' checked={court.flipped} onChange={e => updateCourt({ flipped: e.target.checked })} />
                反転
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.color.textSecondary, cursor: 'pointer', flex: 1 }}>
                <input type='checkbox' checked={court.showZones} onChange={e => updateCourt({ showZones: e.target.checked })} />
                ゾーン表示
              </label>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant='secondary' fullWidth onClick={onResetPositions}>
                <i className='fa-solid fa-arrows-rotate' /> 初期配置
              </Button>
              <Button variant='secondary' fullWidth onClick={onFitToCourt}>
                <i className='fa-solid fa-expand' /> 全体表示
              </Button>
            </div>
            <Button fullWidth onClick={onAddBall}>
              <i className='fa-solid fa-circle' style={{ fontSize: 10 }} /> ボールを追加
            </Button>
          </div>
        )}
      </div>

      <Divider />

      <div>
        <SectionLabel>ファイル</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <Button variant='primary' fullWidth onClick={onExport}>
            <i className='fa-solid fa-download' /> PNGで書き出す
          </Button>
          <Button fullWidth onClick={onOpenProjects}>
            <i className='fa-solid fa-folder-open' /> プロジェクト
          </Button>
          <Button fullWidth onClick={onShareLink}>
            <i className='fa-solid fa-share-nodes' /> シェアリンクをコピー
          </Button>
        </div>
      </div>
    </div>
  );
};
