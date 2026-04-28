import { useState } from 'react';
import { theme, panelSurface } from '../ui/theme';
import { Button, IconButton } from '../ui/Button';
import { SectionLabel, Divider, FieldLabel, Select } from '../ui/Panel';
import { useIsMobile } from '../hooks/useIsMobile';

const FONTS = [
  { label: '標準', value: 'system-ui, -apple-system, sans-serif' },
  { label: '手書き', value: "'Zen Maru Gothic', sans-serif" },
  { label: '丸ゴシック', value: "'M PLUS Rounded 1c', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
];

type DrawTool = 'select' | 'arrow' | 'line' | 'text' | 'rect' | 'circle' | 'ellipse';

interface Props {
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  drawColor: string;
  setDrawColor: (c: string) => void;
  drawWidth: number;
  setDrawWidth: (w: number) => void;
  drawDash: boolean;
  setDrawDash: (d: boolean) => void;
  drawBezier: boolean;
  setDrawBezier: (b: boolean) => void;
  onClearDrawings: () => void;
  textFontSize: number;
  setTextFontSize: (s: number) => void;
  textFontFamily: string;
  setTextFontFamily: (f: string) => void;
  mobileVisible?: boolean;
}

const TOOLS: { value: DrawTool; icon: string; label: string }[] = [
  { value: 'select',  icon: 'fa-arrow-pointer',    label: '選択' },
  { value: 'arrow',   icon: 'fa-arrow-right-long', label: '矢印' },
  { value: 'line',    icon: 'fa-minus',            label: '線' },
  { value: 'text',    icon: 'fa-font',             label: 'テキスト' },
  { value: 'rect',    icon: 'fa-regular fa-square',label: '四角' },
  { value: 'circle',  icon: 'fa-regular fa-circle',label: '円' },
  { value: 'ellipse', icon: 'fa-regular fa-circle',label: '楕円', scaleX: 1.5 },
] as { value: DrawTool; icon: string; label: string; scaleX?: number }[];

const COLORS = ['#ef4444', '#3b82f6', '#0f172a', '#f59e0b', '#10b981', '#ffffff'];

export const DrawingPanel = ({
  tool, setTool, drawColor, setDrawColor, drawWidth, setDrawWidth,
  drawDash, setDrawDash, drawBezier, setDrawBezier, onClearDrawings,
  textFontSize, setTextFontSize, textFontFamily, setTextFontFamily, mobileVisible,
}: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const hidden = isMobile && !mobileVisible;

  if (collapsed && !isMobile) {
    return (
      <div style={{ position: 'fixed', bottom: 16, right: 290, zIndex: 100 }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            ...panelSurface,
            borderRadius: theme.radius.lg,
            padding: '8px 14px',
            fontSize: 12, fontWeight: 600, color: theme.color.text,
            border: `1px solid ${theme.color.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <i className='fa-solid fa-pencil' /> 描画ツール
        </button>
      </div>
    );
  }

  return (
    <div style={{
      ...panelSurface,
      position: 'fixed',
      bottom: isMobile ? 'calc(52px + env(safe-area-inset-bottom, 0px))' : 16,
      right: isMobile ? 0 : 290,
      left: isMobile ? 0 : 'auto',
      zIndex: 100,
      borderRadius: isMobile ? '18px 18px 0 0' : theme.radius.xl,
      padding: 14,
      color: theme.color.text,
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column',
      gap: 10,
      minWidth: isMobile ? 'unset' : 320,
      maxWidth: isMobile ? '100%' : '92vw',
      maxHeight: isMobile ? '42vh' : 'none',
      overflowY: isMobile ? 'auto' : 'visible',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>描画ツール</span>
        {!isMobile && (
          <IconButton onClick={() => setCollapsed(true)} title='折りたたむ'>
            <i className='fa-solid fa-chevron-down' style={{ fontSize: 11 }} />
          </IconButton>
        )}
      </div>

      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {(TOOLS as { value: DrawTool; icon: string; label: string; scaleX?: number }[]).map(t => (
          <button
            key={t.value}
            onClick={() => setTool(t.value)}
            title={t.label}
            style={{
              height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${tool === t.value ? theme.color.accent : theme.color.border}`,
              background: tool === t.value ? theme.color.accent : theme.color.surfaceSolid,
              color: tool === t.value ? '#fff' : theme.color.text,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: tool === t.value ? `0 0 0 3px ${theme.color.accentSoft}` : 'none',
              transition: theme.transition,
            }}
          >
            <i
              className={t.icon.startsWith('fa-') && !t.icon.includes(' ') ? `fa-solid ${t.icon}` : t.icon}
              style={t.scaleX ? { transform: `scaleX(${t.scaleX})`, display: 'inline-block' } : undefined}
            />
          </button>
        ))}
      </div>

      {(tool === 'arrow' || tool === 'line' || tool === 'rect' || tool === 'circle' || tool === 'ellipse' || tool === 'text') && (
        <>
          <Divider />
          <div>
            <FieldLabel>カラー</FieldLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: c,
                    border: drawColor === c ? `2px solid ${theme.color.surfaceSolid}` : `1px solid ${theme.color.border}`,
                    boxShadow: drawColor === c ? `0 0 0 2.5px ${theme.color.accent}` : theme.shadow.sm,
                    cursor: 'pointer', padding: 0,
                    transition: theme.transition,
                  }}
                />
              ))}
              <input
                type='color'
                value={drawColor}
                onChange={e => setDrawColor(e.target.value)}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  border: `1px solid ${theme.color.border}`,
                  padding: 0, cursor: 'pointer',
                }}
                title='カスタムカラー'
              />
            </div>
          </div>

          {(tool === 'arrow' || tool === 'line' || tool === 'rect' || tool === 'circle' || tool === 'ellipse') && (
            <div>
              <FieldLabel>線の太さ</FieldLabel>
              <div style={{ display: 'flex', gap: 4 }}>
                {[2, 4, 6].map(w => (
                  <Button key={w} size='sm' active={drawWidth === w} onClick={() => setDrawWidth(w)} fullWidth>
                    {w}px
                  </Button>
                ))}
              </div>
            </div>
          )}

          {tool === 'text' && (
            <>
              <div>
                <FieldLabel>フォント</FieldLabel>
                <Select value={textFontFamily} onChange={setTextFontFamily}>
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>文字サイズ</FieldLabel>
                <input
                  type='number'
                  min={8}
                  max={200}
                  value={textFontSize}
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 8) setTextFontSize(v); }}
                  style={{
                    width: '100%', padding: '6px 8px', borderRadius: theme.radius.md,
                    border: `1px solid ${theme.color.border}`,
                    background: theme.color.surfaceSolid, color: theme.color.text,
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          {(tool === 'arrow' || tool === 'line') && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tool === 'line' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.color.textSecondary, cursor: 'pointer' }}>
                  <input type='checkbox' checked={drawDash} onChange={e => setDrawDash(e.target.checked)} />
                  破線
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.color.textSecondary, cursor: 'pointer' }}>
                <input type='checkbox' checked={drawBezier} onChange={e => setDrawBezier(e.target.checked)} />
                ベジェ曲線（ダブルクリックで確定）
              </label>
            </div>
          )}
        </>
      )}

      <Divider />

      <SectionLabel>操作</SectionLabel>
      <Button fullWidth variant='danger' onClick={onClearDrawings}>
        <i className='fa-solid fa-trash' /> 矢印・線を全削除
      </Button>
    </div>
  );
};
