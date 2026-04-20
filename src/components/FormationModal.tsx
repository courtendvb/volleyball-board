import { useState, useEffect } from 'react';
import type { Board } from '../hooks/useBoard';
import type { CourtShape, PlayerShape } from '../types';
import { ROTATIONS, getCourtParams, DEFAULT_ROTATIONS, invertCourtTransform, applyCourtTransform } from '../utils/formationUtils';
import { theme } from '../ui/theme';
import { Button, IconButton } from '../ui/Button';
import { SectionLabel, FieldLabel, Input } from '../ui/Panel';

interface FormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'A' | 'B';
  board: Board;
}

export const FormationModal = ({ isOpen, onClose, activeTab, board }: FormationModalProps) => {
  const [rotations, setRotations] = useState<Record<string, Record<string, Record<string, any>>>>(DEFAULT_ROTATIONS);
  const [customPresets, setCustomPresets] = useState<Record<string, Record<string, Record<string, any>>>>({ A: {}, B: {} });
  const [presetName, setPresetName] = useState('');
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('v-tactics-rotations-v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRotations({
          A: { ...DEFAULT_ROTATIONS.A, ...(parsed.A ?? {}) },
          B: { ...DEFAULT_ROTATIONS.B, ...(parsed.B ?? {}) },
        });
      }
    } catch { localStorage.removeItem('v-tactics-rotations-v2'); }
    try {
      const savedCustom = localStorage.getItem('v-tactics-custom-presets-v2');
      if (savedCustom) setCustomPresets(JSON.parse(savedCustom));
    } catch { localStorage.removeItem('v-tactics-custom-presets-v2'); }
  }, [isOpen]);

  const saveFormationData = (name: string, isCustom: boolean) => {
    if (isCustom && !name.trim()) return alert('保存名を入力してください');
    const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;
    if (!court) return;

    const { orientation, flipped } = getCourtParams(court);
    const isHoriz = orientation === 'horizontal';

    const teamPhys: any[] = [];
    board.shapes.forEach(shape => {
      if (shape.type === 'ball' || (shape.type === 'player' && (shape as PlayerShape).team === activeTab)) {
        const mSize = shape.type === 'player' ? 78 : 28;
        const cx = shape.x + mSize / 2;
        const cy = shape.y + mSize / 2;
        const { physX, physY } = invertCourtTransform(cx, cy, court.x, court.y, isHoriz, flipped);
        // キーを背番号にすることでID変更（CSV再読込・白紙リセット）後も復元できる
        const key = shape.type === 'ball' ? 'ball' : (shape as PlayerShape).number;
        teamPhys.push({ key, physX, physY, mSize });
      }
    });

    let sumY = 0;
    teamPhys.forEach(p => sumY += p.physY);
    const isBottom = teamPhys.length > 0 ? (sumY / teamPhys.length >= 0) : true;
    const newPositions: Record<string, any> = {};
    teamPhys.forEach(p => {
      newPositions[p.key] = { netX: isBottom ? p.physX : -p.physX, netY: isBottom ? p.physY : -p.physY, mSize: p.mSize };
    });

    if (isCustom) {
      const newCustom = { ...customPresets, [activeTab]: { ...customPresets[activeTab], [name]: newPositions } };
      setCustomPresets(newCustom);
      localStorage.setItem('v-tactics-custom-presets-v2', JSON.stringify(newCustom));
      setPresetName('');
    } else {
      const newRots = { ...rotations, [activeTab]: { ...rotations[activeTab], [name]: newPositions } };
      setRotations(newRots);
      localStorage.setItem('v-tactics-rotations-v2', JSON.stringify(newRots));
      alert(`「${name}」を保存しました`);
    }
  };

  const loadFormationData = (name: string, isCustom: boolean) => {
    const court = board.shapes.find(s => s.type === 'court') as CourtShape | undefined;
    if (!court) return;

    const { courtType, orientation, flipped } = getCourtParams(court);
    const isHoriz = orientation === 'horizontal';

    let isBottomTarget = true;
    if      (courtType === 'top35')    isBottomTarget = false;
    else if (courtType === 'bottom35') isBottomTarget = true;
    else if (courtType === 'half')     isBottomTarget = !flipped;
    else                               isBottomTarget = activeTab === 'A' ? !flipped : flipped;

    const source = isCustom ? customPresets : rotations;
    const targetPositions = source[activeTab]?.[name];
    if (!targetPositions) return alert('データが見つかりません');

    const updates: { id: string; startX: number; startY: number; endX: number; endY: number }[] = [];

    if (isCustom) {
      Object.keys(targetPositions).forEach(key => {
        let shape: typeof board.shapes[number] | undefined;
        if (key === 'ball') {
          shape = board.shapes.find(s => s.type === 'ball');
        } else if (key.includes('-') && key.length > 20) {
          // 旧フォーマット（ID保存）との後方互換
          shape = board.shapes.find(s => s.id === key);
        } else {
          // 新フォーマット：背番号で照合
          shape = board.shapes.find(s => s.type === 'player' && (s as PlayerShape).team === activeTab && (s as PlayerShape).number === key);
        }
        if (!shape) return;
        const { netX, netY, mSize } = targetPositions[key];
        const physX = isBottomTarget ? netX : -netX;
        const physY = isBottomTarget ? netY : -netY;
        const { worldX, worldY } = applyCourtTransform(physX, physY, court.x, court.y, isHoriz, flipped);
        updates.push({ id: shape.id, startX: shape.x, startY: shape.y, endX: worldX - mSize / 2, endY: worldY - mSize / 2 });
      });
    } else {
      const teamPlayers = board.shapes.filter(s => s.type === 'player' && (s as PlayerShape).team === activeTab) as PlayerShape[];
      const roleMapping: Record<string, PlayerShape | undefined> = {};
      const ROLES = ['S', 'OH1', 'MB2', 'OP', 'OH2', 'MB1', 'L'];
      // slotがある選手は直接対応、ない選手は番号順でフォールバック
      teamPlayers.forEach(p => { if (p.slot && ROLES.includes(p.slot)) roleMapping[p.slot] = p; });
      const unassigned = teamPlayers.filter(p => !p.slot || !ROLES.includes(p.slot)).sort((a, b) => parseInt(a.number) - parseInt(b.number));
      let ui = 0;
      ROLES.forEach(role => { if (!roleMapping[role] && ui < unassigned.length) roleMapping[role] = unassigned[ui++]; });

      Object.keys(targetPositions).forEach(role => {
        const player = roleMapping[role];
        if (!player) return;
        const { netX, netY, mSize } = targetPositions[role];
        const physX = isBottomTarget ? netX : -netX;
        const physY = isBottomTarget ? netY : -netY;
        const { worldX, worldY } = applyCourtTransform(physX, physY, court.x, court.y, isHoriz, flipped);
        updates.push({ id: player.id, startX: player.x, startY: player.y, endX: worldX - mSize / 2, endY: worldY - mSize / 2 });
      });
    }

    if (updates.length > 0) {
      const duration = 600; const t0 = Date.now();
      const step = () => {
        const p = Math.min((Date.now() - t0) / duration, 1); const e = p * (2 - p);
        const batch = updates.map(u => ({
          id: u.id,
          changes: { x: u.startX + (u.endX - u.startX) * e, y: u.startY + (u.endY - u.startY) * e }
        }));
        board.updateShapes(batch);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  const deleteCustomPreset = (name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const newCustom = { ...customPresets };
    delete newCustom[activeTab][name];
    setCustomPresets(newCustom);
    localStorage.setItem('v-tactics-custom-presets-v2', JSON.stringify(newCustom));
  };

  if (!isOpen) return null;

  const teamLabel = activeTab === 'A' ? 'チームA' : 'チームB';
  const teamColor = activeTab === 'A' ? theme.color.teamA : theme.color.teamB;
  const customList = Object.keys(customPresets[activeTab] || {});

  return (
    <div
      onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onPointerDown={e => e.stopPropagation()}
        style={{
          background: theme.color.surfaceSolid,
          borderRadius: isMobile ? '20px 20px 0 0' : theme.radius.xl,
          width: isMobile ? '100%' : 460,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: isMobile ? '90vh' : '85vh',
          overflow: 'hidden',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '16px 18px',
          borderBottom: `1px solid ${theme.color.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: theme.color.surfaceSolid,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: theme.radius.sm,
              background: theme.color.accentSoft,
              color: theme.color.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>
              <i className='fa-solid fa-clipboard-list' />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text, letterSpacing: '-0.01em' }}>
                陣形管理
              </div>
              <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                  background: teamColor,
                }} />
                {teamLabel}
              </div>
            </div>
          </div>
          <IconButton onClick={onClose} title='閉じる'>
            <i className='fa-solid fa-xmark' />
          </IconButton>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <SectionLabel>レセプション陣形 (S1〜S6)</SectionLabel>
            <div style={{
              marginTop: 8,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            }}>
              {ROTATIONS.map(rot => {
                const isSaved = !!rotations[activeTab]?.[rot];
                return (
                  <div key={rot} style={{ display: 'flex', gap: 4 }}>
                    <Button
                      fullWidth
                      onClick={() => loadFormationData(rot, false)}
                      style={{
                        justifyContent: 'flex-start',
                        background: isSaved ? 'rgba(16, 185, 129, 0.1)' : theme.color.surfaceHover,
                        borderColor: isSaved ? 'rgba(16, 185, 129, 0.4)' : theme.color.border,
                        color: isSaved ? '#047857' : theme.color.text,
                      }}
                    >
                      <i className={isSaved ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} style={{ fontSize: 11 }} />
                      {rot}
                    </Button>
                    <IconButton
                      onClick={() => saveFormationData(rot, false)}
                      title={`${rot}に現在の配置を保存`}
                      style={{
                        background: theme.color.success,
                        color: '#fff',
                        width: 32, height: 32,
                        borderRadius: theme.radius.md,
                        flexShrink: 0,
                      }}
                    >
                      <i className='fa-regular fa-floppy-disk' style={{ fontSize: 12 }} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionLabel>カスタム陣形</SectionLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <FieldLabel>新しい陣形を保存</FieldLabel>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input
                    value={presetName}
                    onChange={setPresetName}
                    placeholder='例: S1攻撃パターン'
                  />
                  <Button variant='primary' onClick={() => saveFormationData(presetName, true)}>
                    <i className='fa-regular fa-floppy-disk' /> 保存
                  </Button>
                </div>
              </div>

              {customList.length === 0 ? (
                <div style={{
                  fontSize: 11, color: theme.color.textMuted,
                  textAlign: 'center', padding: '16px 0',
                  border: `1px dashed ${theme.color.border}`,
                  borderRadius: theme.radius.md,
                }}>
                  まだカスタム陣形はありません
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {customList.map(name => (
                    <div key={name} style={{ display: 'flex', gap: 4 }}>
                      <Button
                        fullWidth
                        onClick={() => loadFormationData(name, true)}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <i className='fa-solid fa-play' style={{ fontSize: 10, color: theme.color.accent }} />
                        {name}
                      </Button>
                      <IconButton
                        onClick={() => deleteCustomPreset(name)}
                        title='削除'
                        style={{ color: theme.color.danger, width: 32, height: 32 }}
                      >
                        <i className='fa-solid fa-trash' style={{ fontSize: 11 }} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
