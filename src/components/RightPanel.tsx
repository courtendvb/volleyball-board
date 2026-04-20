import { useState, useRef } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Board } from '../hooks/useBoard';
import type { PlayerShape, TeamLabelShape, CourtShape } from '../types';
import { FormationModal } from './FormationModal';
import { theme, panelSurface } from '../ui/theme';
import { Button, IconButton } from '../ui/Button';
import { SectionLabel, Divider, FieldLabel, Input, Select } from '../ui/Panel';
import { calcBasePositions } from '../utils/formationUtils';
import { newId } from '../utils/id';
import { builtinTeams } from '../data/builtinTeams';

const FONTS = [
  { label: '標準', value: 'system-ui, -apple-system, sans-serif' },
  { label: '手書き', value: "'Zen Maru Gothic', sans-serif" },
  { label: '丸ゴシック', value: "'M PLUS Rounded 1c', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
];

interface Props {
  board: Board;
  fontFamily: string;
  setFontFamily: (f: string) => void;
  mobileVisible?: boolean;
  onAddPlayer: (team: 'A' | 'B') => void;
}

const ColorInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input
    type='color'
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      width: 34, height: 34,
      borderRadius: theme.radius.md,
      border: `1px solid ${theme.color.border}`,
      padding: 2,
      background: theme.color.surfaceSolid,
      cursor: 'pointer',
      flexShrink: 0,
    }}
  />
);

const ROLES = ['S', 'OH1', 'MB2', 'OP', 'OH2', 'MB1', 'L'];
const SLOT_TO_ROLE: Record<string, string> = {
  '1': 'S', '2': 'OH1', '3': 'MB2', '4': 'OP', '5': 'OH2', '6': 'MB1', 'L': 'L', 'l': 'L',
};

type CsvRow = { number: string; name: string; position: string; slot: string; color: string; nameColor: string; };

export const RightPanel = ({ board, fontFamily, setFontFamily, mobileVisible, onAddPlayer }: Props) => {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [collapsed, setCollapsed] = useState(false);
  const [isFormationOpen, setIsFormationOpen] = useState(false);
  const isMobile = useIsMobile();
  const animRafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvTeams, setCsvTeams] = useState<Record<string, CsvRow[]>>({});
  const [selectedCsvTeam, setSelectedCsvTeam] = useState<string>('');
  const [showBuiltinPicker, setShowBuiltinPicker] = useState(false);
  const hidden = isMobile && !mobileVisible;

  const players = board.shapes.filter(s => s.type === 'player') as PlayerShape[];
  const teamPlayers = players.filter(p => p.team === activeTab);
  const labelShape = board.shapes.find(s => s.type === 'team-label' && (s as TeamLabelShape).team === activeTab) as TeamLabelShape | undefined;

  const selectedIds = board.selectedIds;
  const selectedShape = selectedIds.length === 1
    ? board.shapes.find(s => s.id === selectedIds[0])
    : undefined;
  const selectedPlayer = selectedShape?.type === 'player' ? selectedShape as PlayerShape : undefined;
  const selectedText = selectedShape?.type === 'text' ? selectedShape as any : undefined;
  const selectedDrawing = (selectedShape?.type === 'rect' || selectedShape?.type === 'circle' || selectedShape?.type === 'ellipse' || selectedShape?.type === 'arrow' || selectedShape?.type === 'line') ? selectedShape as any : undefined;

  const updatePlayer = (id: string, updates: Partial<PlayerShape>) => board.updateShape(id, updates);
  const updateShape = (id: string, updates: any) => board.updateShape(id, updates);

  const parseCsvIntoTeams = (text: string, fallbackName: string): Record<string, CsvRow[]> => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return {};
    const sep = lines[0].includes('\t') ? '\t' : ',';
    const parse = (l: string) => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const firstCols = parse(lines[0]);
    const hasTeamCol = firstCols.length >= 2 && isNaN(Number(firstCols[0])) && isNaN(Number(firstCols[1]));
    const grouped: Record<string, CsvRow[]> = {};
    if (hasTeamCol) {
      const startIdx = isNaN(Number(parse(lines[0])[1])) ? 1 : 0;
      lines.slice(startIdx).forEach(line => {
        const cols = parse(line);
        const teamName = cols[0] || '未設定';
        if (!grouped[teamName]) grouped[teamName] = [];
        grouped[teamName].push({ number: cols[1] || '', name: cols[2] || '', position: cols[3] || '', slot: cols[4] || '', color: cols[5] || '', nameColor: cols[6] || '' });
      });
    } else {
      const startIdx = isNaN(Number(firstCols[0])) ? 1 : 0;
      grouped[fallbackName] = lines.slice(startIdx).map(line => {
        const cols = parse(line);
        return { number: cols[0] || '', name: cols[1] || '', position: cols[2] || '', slot: cols[3] || '', color: cols[4] || '', nameColor: cols[5] || '' };
      });
    }
    return grouped;
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const grouped = parseCsvIntoTeams(text, file.name.replace(/\.[^.]+$/, ''));
      setCsvTeams(grouped);
      setSelectedCsvTeam(Object.keys(grouped)[0] || '');
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleSelectBuiltin = (name: string) => {
    const text = builtinTeams[name];
    const grouped = parseCsvIntoTeams(text, name);
    setShowBuiltinPicker(false);
    setCsvTeams(grouped);
    setSelectedCsvTeam(Object.keys(grouped)[0] || '');
  };

  const doImport = (asTeam: 'A' | 'B') => {
    const rows = csvTeams[selectedCsvTeam];
    if (!rows || rows.length === 0) return;

    const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;
    const posMap = court ? calcBasePositions(court.x, court.y, court, asTeam) : {};
    const fallbackColor = asTeam === 'A' ? '#ef4444' : '#3b82f6';
    const maxZ = board.shapes.reduce((m, s) => Math.max(m, s.zIndex), 0);

    const existingIds = board.shapes
      .filter(s => s.type === 'player' && (s as PlayerShape).team === asTeam)
      .map(s => s.id);

    const newPlayers: PlayerShape[] = rows.map((row, idx) => {
      // スロット指定があればそれを使い、なければ順番通りに配置（従来の挙動）
      const role = row.slot ? (SLOT_TO_ROLE[row.slot] ?? '') : (ROLES[idx] ?? '');
      const isLibero = row.position === 'L' || role === 'L';
      const pos = role && posMap[role] ? posMap[role] : { x: 0, y: 0 };
      // スロット空白は非表示、それ以外は従来通り（チームAは表示、チームBは非表示）
      const onCourt = row.slot ? !!role : idx < ROLES.length;
      const isVisible = onCourt && asTeam === 'A';
      const color = row.color || (isLibero ? '#1f2937' : fallbackColor);
      const nameColor = (row.nameColor === 'white' || row.nameColor === 'black')
        ? row.nameColor
        : isLibero ? 'white' : 'black';
      return {
        id: newId(), type: 'player' as const, team: asTeam,
        x: pos.x, y: pos.y, zIndex: maxZ + idx + 1,
        number: row.number, name: row.name,
        color, position: row.position,
        namePosition: asTeam === 'A' ? 'bottom' : 'top',
        isVisible, isFree: false, nameColor,
      } as PlayerShape;
    });

    const otherShapes = board.shapes.filter(s => !existingIds.includes(s.id));
    (board as any).setState({ shapes: [...otherShapes, ...newPlayers], selectedIds: [], camera: board.camera });
    setCsvTeams({});
    setSelectedCsvTeam('');
  };

  const handleRotate = (direction: 'gain' | 'back') => {
    const ROTATION_ORDER = ['S', 'OH1', 'MB2', 'OP', 'OH2', 'MB1'];
    const sorted = [...teamPlayers].sort((a, b) => parseInt(a.number) - parseInt(b.number));

    const roleMapping: Record<string, PlayerShape | undefined> = {};
    ROTATION_ORDER.forEach((role, idx) => { roleMapping[role] = sorted[idx]; });

    const shapes = ROTATION_ORDER.map(role => roleMapping[role]).filter(Boolean) as PlayerShape[];
    if (shapes.length < 6) return alert('ローテーションは同じチームに6人の選手が必要です');

    const positions = shapes.map(s => ({ x: s.x, y: s.y }));
    const targets = direction === 'gain'
      ? positions.map((_, i) => positions[(i - 1 + 6) % 6])
      : positions.map((_, i) => positions[(i + 1) % 6]);

    const updates = shapes.map((s, i) => ({ id: s.id, sx: s.x, sy: s.y, ex: targets[i].x, ey: targets[i].y }));
    const duration = 500; const t0 = Date.now();
    if (animRafRef.current !== null) cancelAnimationFrame(animRafRef.current);

    const step = () => {
      const p = Math.min((Date.now() - t0) / duration, 1); const e = p * (2 - p);
      board.updateShapes(updates.map(u => ({ id: u.id, changes: { x: u.sx + (u.ex - u.sx) * e, y: u.sy + (u.ey - u.sy) * e } })));
      if (p < 1) { animRafRef.current = requestAnimationFrame(step); } else { animRafRef.current = null; }
    };
    animRafRef.current = requestAnimationFrame(step);
  };

  if (collapsed && !isMobile) {
    return (
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            ...panelSurface,
            width: 42, height: 42, borderRadius: theme.radius.lg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: theme.color.text, fontSize: 16, border: `1px solid ${theme.color.border}`,
          }}
          title='プレイヤーパネルを開く'
        >
          <i className='fa-solid fa-users' />
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
      right: isMobile ? 0 : 16,
      left: isMobile ? 0 : 'auto',
      width: isMobile ? '100%' : 275,
      maxHeight: isMobile ? '42vh' : 'calc(100vh - 32px)',
      borderRadius: isMobile ? '18px 18px 0 0' : theme.radius.xl,
      padding: 14,
      overflowY: 'auto',
      zIndex: 100,
      color: theme.color.text,
      boxSizing: 'border-box',
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          display: 'inline-flex',
          background: theme.color.surfaceSunken,
          borderRadius: theme.radius.md,
          padding: 3,
          gap: 2,
        }}>
          {(['A', 'B'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                border: 'none',
                background: activeTab === t ? theme.color.surfaceSolid : 'transparent',
                color: activeTab === t ? theme.color.text : theme.color.textSecondary,
                boxShadow: activeTab === t ? theme.shadow.sm : 'none',
                borderRadius: theme.radius.sm,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: theme.transition,
              }}
            >
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: t === 'A' ? theme.color.teamA : theme.color.teamB,
                marginRight: 6, verticalAlign: 'middle',
              }} />
              チーム{t}
            </button>
          ))}
        </div>
        {!isMobile && (
          <IconButton onClick={() => setCollapsed(true)} title='閉じる'>
            <i className='fa-solid fa-xmark' />
          </IconButton>
        )}
      </div>

      <Divider />

      <div>
        <FieldLabel>チーム名</FieldLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          <ColorInput
            value={labelShape?.color ?? (activeTab === 'A' ? theme.color.teamA : theme.color.teamB)}
            onChange={c => {
              teamPlayers.forEach(p => board.updateShape(p.id, { color: c }));
              if (labelShape) board.updateShape(labelShape.id, { color: c });
            }}
          />
          <Input
            value={labelShape?.name ?? (activeTab === 'A' ? 'チームA' : 'チームB')}
            onChange={v => labelShape && board.updateShape(labelShape.id, { name: v })}
          />
          <IconButton
            active={labelShape?.isVisible}
            onClick={() => labelShape && board.updateShape(labelShape.id, { isVisible: !labelShape.isVisible })}
            title='コート上の表示切替'
            style={{ width: 34, height: 34, flexShrink: 0 }}
          >
            <i className={labelShape?.isVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'} />
          </IconButton>
        </div>
      </div>

      <Divider />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          ref={fileInputRef}
          type='file'
          accept='.csv,.tsv,.txt'
          style={{ display: 'none' }}
          onChange={handleImportCSV}
        />
        <Button fullWidth onClick={() => fileInputRef.current?.click()}>
          <i className='fa-solid fa-file-csv' /> CSVから名簿を読み込む
        </Button>
        {Object.keys(builtinTeams).length > 0 && (
          <Button fullWidth onClick={() => setShowBuiltinPicker(true)}>
            <i className='fa-solid fa-users' /> 内蔵プリセットから読み込む
          </Button>
        )}
      </div>

      <Divider />

      <div>
        <SectionLabel>ローテーション</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
          <Button variant='primary' onClick={() => handleRotate('gain')}>
            <i className='fa-solid fa-rotate-right' /> 正回転
          </Button>
          <Button onClick={() => handleRotate('back')}>
            <i className='fa-solid fa-rotate-left' /> 逆回転
          </Button>
        </div>
        <Button fullWidth onClick={() => setIsFormationOpen(true)} style={{ marginTop: 6 }}>
          <i className='fa-solid fa-clipboard-list' /> 陣形・プリセットを開く
        </Button>
      </div>

      <Divider />

      <div>
        <SectionLabel>プレイヤー ({teamPlayers.length})</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {teamPlayers
            .sort((a, b) => parseInt(a.number) - parseInt(b.number))
            .map(p => {
              const isSel = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => board.select([p.id])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isSel ? theme.color.accentSoft : theme.color.surfaceSolid,
                    borderRadius: theme.radius.md,
                    padding: '7px 10px',
                    cursor: 'pointer',
                    border: `1px solid ${isSel ? theme.color.accent : theme.color.border}`,
                    opacity: p.isVisible ? 1 : 0.5,
                    transition: theme.transition,
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: p.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: theme.shadow.sm, position: 'relative',
                  }}>
                    <input
                      value={p.number}
                      onChange={e => updatePlayer(p.id, { number: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                        color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center',
                        cursor: 'text', padding: 0, outline: 'none', borderRadius: '50%',
                      }}
                      maxLength={2}
                    />
                  </div>
                  <input
                    value={p.name}
                    onChange={e => updatePlayer(p.id, { name: e.target.value })}
                    onClick={e => e.stopPropagation()}
                    placeholder={`#${p.number}`}
                    style={{
                      flex: 1, fontSize: 12.5, fontWeight: 500, border: 'none',
                      background: 'transparent', color: theme.color.text, outline: 'none',
                      cursor: 'text', minWidth: 0, padding: 0,
                    }}
                  />
                  {p.position && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
                      background: theme.color.text, color: 'white',
                      padding: '2px 6px', borderRadius: theme.radius.sm,
                    }}>{p.position}</span>
                  )}
                  <IconButton
                    onClick={() => updatePlayer(p.id, { isVisible: !p.isVisible })}
                    title='表示/非表示'
                    style={{ width: 24, height: 24 }}
                  >
                    <i className={p.isVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'} style={{ fontSize: 11 }} />
                  </IconButton>
                  <IconButton
                    onClick={() => board.deleteShape(p.id)}
                    title='削除'
                    style={{ width: 24, height: 24, color: theme.color.danger }}
                  >
                    <i className='fa-solid fa-xmark' style={{ fontSize: 12 }} />
                  </IconButton>
                </div>
              );
            })}
          <button
            onClick={() => onAddPlayer(activeTab)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: `1px dashed ${theme.color.border}`,
              background: 'transparent',
              color: theme.color.textMuted,
              borderRadius: theme.radius.md,
              padding: '7px 10px',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: theme.transition,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.color.accent; e.currentTarget.style.color = theme.color.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.color.border; e.currentTarget.style.color = theme.color.textMuted; }}
          >
            <i className='fa-solid fa-plus' style={{ fontSize: 11 }} /> 選手を追加
          </button>
        </div>
      </div>

      {selectedIds.length >= 2 && (
        <>
          <Divider />
          <div>
            <SectionLabel>整列 ({selectedIds.length}個選択)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 6 }}>
              <Button size='sm' onClick={() => board.alignShapes(selectedIds, 'left')} title='左揃え'>
                <i className='fa-solid fa-align-left' />
              </Button>
              <Button size='sm' onClick={() => board.alignShapes(selectedIds, 'centerH')} title='水平中央揃え'>
                <i className='fa-solid fa-align-center' />
              </Button>
              <Button size='sm' onClick={() => board.alignShapes(selectedIds, 'right')} title='右揃え'>
                <i className='fa-solid fa-align-right' />
              </Button>
              <Button size='sm' onClick={() => board.alignShapes(selectedIds, 'top')} title='上揃え'>
                <i className='fa-solid fa-arrow-up-to-line' />
              </Button>
              <Button size='sm' onClick={() => board.alignShapes(selectedIds, 'centerV')} title='垂直中央揃え'>
                <i className='fa-solid fa-grip-lines' />
              </Button>
              <Button size='sm' onClick={() => board.alignShapes(selectedIds, 'bottom')} title='下揃え'>
                <i className='fa-solid fa-arrow-down-to-line' />
              </Button>
            </div>
            {selectedIds.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                <Button size='sm' onClick={() => board.distributeShapes(selectedIds, 'horizontal')} title='水平等間隔'>
                  <i className='fa-solid fa-arrows-left-right' /> 水平分配
                </Button>
                <Button size='sm' onClick={() => board.distributeShapes(selectedIds, 'vertical')} title='垂直等間隔'>
                  <i className='fa-solid fa-arrows-up-down' /> 垂直分配
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {selectedPlayer && selectedPlayer.team === activeTab && (
        <>
          <Divider />
          <div>
            <SectionLabel>選手設定 · #{selectedPlayer.number}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel>背番号</FieldLabel>
                  <Input value={selectedPlayer.number} onChange={v => updatePlayer(selectedPlayer.id, { number: v })} />
                </div>
                <div>
                  <FieldLabel>色</FieldLabel>
                  <ColorInput value={selectedPlayer.color || '#ef4444'} onChange={c => updatePlayer(selectedPlayer.id, { color: c })} />
                </div>
              </div>
              <div>
                <FieldLabel>選手名</FieldLabel>
                <Input value={selectedPlayer.name} onChange={v => updatePlayer(selectedPlayer.id, { name: v })} />
              </div>
              <div>
                <FieldLabel>ポジション</FieldLabel>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {['', 'S', 'OH', 'MB', 'OP', 'L'].map(pos => (
                    <Button
                      key={pos}
                      size='sm'
                      active={selectedPlayer.position === pos}
                      onClick={() => updatePlayer(selectedPlayer.id, { position: pos })}
                    >
                      {pos || 'クリア'}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>名前の位置</FieldLabel>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button fullWidth active={selectedPlayer.namePosition === 'top'}
                    onClick={() => updatePlayer(selectedPlayer.id, { namePosition: 'top' })}>
                    <i className='fa-solid fa-arrow-up' /> 上
                  </Button>
                  <Button fullWidth active={selectedPlayer.namePosition === 'bottom'}
                    onClick={() => updatePlayer(selectedPlayer.id, { namePosition: 'bottom' })}>
                    <i className='fa-solid fa-arrow-down' /> 下
                  </Button>
                </div>
              </div>
              <div>
                <FieldLabel>名前の色</FieldLabel>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button fullWidth active={selectedPlayer.nameColor === 'black' || !selectedPlayer.nameColor}
                    onClick={() => updatePlayer(selectedPlayer.id, { nameColor: 'black' })}>
                    黒
                  </Button>
                  <Button fullWidth active={selectedPlayer.nameColor === 'white'}
                    onClick={() => updatePlayer(selectedPlayer.id, { nameColor: 'white' })}>
                    白
                  </Button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  fullWidth
                  active={selectedPlayer.isVisible}
                  onClick={() => updatePlayer(selectedPlayer.id, { isVisible: !selectedPlayer.isVisible })}
                >
                  <i className={selectedPlayer.isVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'} />
                  {selectedPlayer.isVisible ? '表示中' : '非表示'}
                </Button>
                <Button
                  fullWidth
                  variant='danger'
                  onClick={() => { board.deleteShape(selectedPlayer.id); board.clearSelection(); }}
                >
                  <i className='fa-solid fa-trash' /> 削除
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedText && (
        <>
          <Divider />
          <div>
            <SectionLabel>テキスト設定</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <div>
                <FieldLabel>テキスト</FieldLabel>
                <Input value={selectedText.text} onChange={v => updateShape(selectedText.id, { text: v })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel>サイズ</FieldLabel>
                  <Select
                    value={String(selectedText.fontSize || 20)}
                    onChange={v => updateShape(selectedText.id, { fontSize: Number(v) })}
                  >
                    {[16, 20, 24, 32, 48].map(s => <option key={s} value={s}>{s}px</option>)}
                  </Select>
                </div>
                <div>
                  <FieldLabel>色</FieldLabel>
                  <ColorInput value={selectedText.color || '#1f2937'} onChange={c => updateShape(selectedText.id, { color: c })} />
                </div>
              </div>
              <Button fullWidth variant='danger' onClick={() => { board.deleteShape(selectedText.id); board.clearSelection(); }}>
                <i className='fa-solid fa-trash' /> 削除
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedDrawing && (
        <>
          <Divider />
          <div>
            <SectionLabel>図形設定</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <div>
                <FieldLabel>色</FieldLabel>
                <ColorInput value={selectedDrawing.color || '#1f2937'} onChange={c => updateShape(selectedDrawing.id, { color: c })} />
              </div>
              <div>
                <FieldLabel>線の太さ</FieldLabel>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[2, 4, 6].map(w => (
                    <Button key={w} size='sm' active={selectedDrawing.strokeWidth === w} onClick={() => updateShape(selectedDrawing.id, { strokeWidth: w })} fullWidth>
                      {w}px
                    </Button>
                  ))}
                </div>
              </div>
              {(selectedDrawing.type === 'arrow' || selectedDrawing.type === 'line') && (
                <div>
                  <FieldLabel>形状</FieldLabel>
                  <Button
                    fullWidth
                    active={selectedDrawing.isBezier}
                    onClick={() => {
                      const isBez = !selectedDrawing.isBezier;
                      const pts = selectedDrawing.points || [];
                      const newPts = [...pts];
                      if (isBez && pts.length === 4) {
                        const [x1, y1, x2, y2] = pts;
                        const dx = x2 - x1; const dy = y2 - y1;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        newPts.splice(2, 0, (x1 + x2) / 2 - dy / len * 30, (y1 + y2) / 2 + dx / len * 30);
                      }
                      updateShape(selectedDrawing.id, { isBezier: isBez, points: newPts });
                    }}
                  >
                    <i className='fa-solid fa-bezier-curve' /> {selectedDrawing.isBezier ? '曲線を解除' : '曲線にする'}
                  </Button>
                  <div style={{ fontSize: 10, color: theme.color.textMuted, marginTop: 4 }}>
                    頂点をドラッグで曲げる箇所を増やせます
                  </div>
                </div>
              )}
              <Button fullWidth variant='danger' onClick={() => { board.deleteShape(selectedDrawing.id); board.clearSelection(); }}>
                <i className='fa-solid fa-trash' /> 削除
              </Button>
            </div>
          </div>
        </>
      )}

      <Divider />

      <div>
        <FieldLabel>マーカーフォント</FieldLabel>
        <Select value={fontFamily} onChange={setFontFamily}>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </Select>
      </div>

      <FormationModal isOpen={isFormationOpen} onClose={() => setIsFormationOpen(false)} activeTab={activeTab} board={board} />

      {showBuiltinPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowBuiltinPicker(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: theme.color.surface, borderRadius: theme.radius.xl,
              padding: 20, width: 300, display: 'flex', flexDirection: 'column', gap: 12,
              boxShadow: theme.shadow.lg,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: theme.color.text }}>
              <i className='fa-solid fa-users' style={{ marginRight: 8, color: theme.color.accent }} />
              内蔵プリセット
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
              {Object.keys(builtinTeams).map(name => (
                <button
                  key={name}
                  onClick={() => handleSelectBuiltin(name)}
                  style={{
                    textAlign: 'left', padding: '10px 14px',
                    border: `1px solid ${theme.color.border}`,
                    background: theme.color.surfaceSolid,
                    color: theme.color.text, borderRadius: theme.radius.md,
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBuiltinPicker(false)}
              style={{ background: 'none', border: 'none', color: theme.color.textMuted, cursor: 'pointer', fontSize: 12 }}
            >キャンセル</button>
          </div>
        </div>
      )}

      {Object.keys(csvTeams).length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setCsvTeams({}); setSelectedCsvTeam(''); }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: theme.color.surface, borderRadius: theme.radius.xl,
              padding: 20, width: 300, display: 'flex', flexDirection: 'column', gap: 12,
              boxShadow: theme.shadow.lg,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: theme.color.text }}>
              <i className='fa-solid fa-file-csv' style={{ marginRight: 8, color: theme.color.accent }} />
              チームを選択
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
              {Object.keys(csvTeams).map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedCsvTeam(name)}
                  style={{
                    textAlign: 'left', padding: '8px 12px',
                    border: `1px solid ${selectedCsvTeam === name ? theme.color.accent : theme.color.border}`,
                    background: selectedCsvTeam === name ? theme.color.accentSoft : theme.color.surfaceSolid,
                    color: theme.color.text, borderRadius: theme.radius.md,
                    cursor: 'pointer', fontSize: 13, fontWeight: selectedCsvTeam === name ? 600 : 400,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>{name}</span>
                  <span style={{ fontSize: 11, color: theme.color.textMuted }}>{csvTeams[name].length}人</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: theme.color.textMuted }}>どちらのチームとして読み込みますか？</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => doImport('A')}
                disabled={!selectedCsvTeam}
                style={{
                  flex: 1, padding: '10px 0', border: 'none',
                  background: theme.color.teamA, color: '#fff',
                  borderRadius: theme.radius.md, fontWeight: 700, fontSize: 13,
                  cursor: selectedCsvTeam ? 'pointer' : 'not-allowed', opacity: selectedCsvTeam ? 1 : 0.5,
                }}
              >チームA</button>
              <button
                onClick={() => doImport('B')}
                disabled={!selectedCsvTeam}
                style={{
                  flex: 1, padding: '10px 0', border: 'none',
                  background: theme.color.teamB, color: '#fff',
                  borderRadius: theme.radius.md, fontWeight: 700, fontSize: 13,
                  cursor: selectedCsvTeam ? 'pointer' : 'not-allowed', opacity: selectedCsvTeam ? 1 : 0.5,
                }}
              >チームB</button>
            </div>
            <button
              onClick={() => { setCsvTeams({}); setSelectedCsvTeam(''); }}
              style={{ background: 'none', border: 'none', color: theme.color.textMuted, cursor: 'pointer', fontSize: 12 }}
            >キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
};
