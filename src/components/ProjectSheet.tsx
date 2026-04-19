import { useState, useEffect, useRef } from 'react';
import type { SavedProject, AnyShape, Camera } from '../types';
import { theme } from '../ui/theme';
import { Button, IconButton } from '../ui/Button';
import { SectionLabel, FieldLabel, Input } from '../ui/Panel';

const PROJECTS_STORAGE_KEY = 'v-tactics-projects-v2';
const BACKUP_KEYS = [
  'v-tactics-board-v2',
  'v-tactics-animations-v2',
  'v-tactics-rotations-v2',
  'v-tactics-custom-presets-v2',
  'v-tactics-projects-v2',
] as const;
const BACKUP_VERSION = 1;

export const loadProjects = (): Record<string, SavedProject> => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    localStorage.removeItem(PROJECTS_STORAGE_KEY);
    return {};
  }
};

const saveProjects = (projects: Record<string, SavedProject>) => {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

const doExportBackup = () => {
  const data: Record<string, unknown> = { __version: BACKUP_VERSION, exportedAt: Date.now() };
  for (const k of BACKUP_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw !== null) {
      try { data[k] = JSON.parse(raw); } catch { data[k] = raw; }
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `v-tactics-backup-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const doImportBackup = (file: File, onDone: () => void) => {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (typeof parsed !== 'object' || parsed === null) throw new Error('形式不正');
      const hasAnyKey = BACKUP_KEYS.some(k => k in parsed);
      if (!hasAnyKey) throw new Error('バックアップデータが見つかりません');
      if (!confirm('現在のデータを上書きしてバックアップを読み込みます。続行しますか？')) return;
      for (const k of BACKUP_KEYS) {
        if (k in parsed && parsed[k] !== undefined) {
          localStorage.setItem(k, JSON.stringify(parsed[k]));
        }
      }
      alert('読み込みました。ページを再読み込みします。');
      onDone();
      window.location.reload();
    } catch (e) {
      alert(`読み込みに失敗しました: ${e instanceof Error ? e.message : e}`);
    }
  };
  reader.readAsText(file);
};

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentShapes: AnyShape[];
  currentCamera: Camera;
  onLoad: (project: SavedProject) => void;
}

export const ProjectSheet = ({ isOpen, onClose, currentShapes, currentCamera, onLoad }: Props) => {
  const [projects, setProjects] = useState<Record<string, SavedProject>>({});
  const [newName, setNewName] = useState('');
  const isMobile = window.innerWidth < 640;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjects(loadProjects());
      setNewName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const list = Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt);

  const doSave = (name: string, isOverwrite: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) { alert('名前を入力してください'); return; }
    if (!isOverwrite && projects[trimmed]) {
      if (!confirm(`「${trimmed}」は既に存在します。上書きしますか？`)) return;
    }
    const next: Record<string, SavedProject> = {
      ...projects,
      [trimmed]: {
        name: trimmed,
        shapes: currentShapes,
        camera: currentCamera,
        updatedAt: Date.now(),
      },
    };
    setProjects(next);
    saveProjects(next);
    setNewName('');
  };

  const doLoad = (project: SavedProject) => {
    onLoad(project);
    onClose();
  };

  const doDelete = (name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const next = { ...projects };
    delete next[name];
    setProjects(next);
    saveProjects(next);
  };

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
          maxHeight: isMobile ? '85vh' : '85vh',
          overflow: 'hidden',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex', flexDirection: 'column',
          animation: isMobile ? 'slide-up 240ms cubic-bezier(0.4, 0, 0.2, 1)' : 'fade-in 200ms ease-out',
        }}
      >
        <style>{`
          @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fade-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        `}</style>

        {isMobile && (
          <div style={{
            display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4,
          }}>
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: theme.color.borderStrong,
            }} />
          </div>
        )}

        <div style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${theme.color.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: theme.radius.sm,
              background: theme.color.accentSoft,
              color: theme.color.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>
              <i className='fa-solid fa-folder-open' />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text, letterSpacing: '-0.01em' }}>
                プロジェクト
              </div>
              <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 1 }}>
                {list.length}件保存済み
              </div>
            </div>
          </div>
          <IconButton onClick={onClose} title='閉じる'>
            <i className='fa-solid fa-xmark' />
          </IconButton>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <SectionLabel>新規保存</SectionLabel>
            <div style={{ marginTop: 8 }}>
              <FieldLabel>プロジェクト名</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  value={newName}
                  onChange={setNewName}
                  placeholder='例: vs ○○高校 スタメン'
                  onKeyDown={e => e.key === 'Enter' && doSave(newName, false)}
                />
                <Button variant='primary' onClick={() => doSave(newName, false)}>
                  <i className='fa-regular fa-floppy-disk' /> 保存
                </Button>
              </div>
            </div>
          </section>

          <section>
            <SectionLabel>保存済み</SectionLabel>
            <div style={{ marginTop: 8 }}>
              {list.length === 0 ? (
                <div style={{
                  fontSize: 12, color: theme.color.textMuted,
                  textAlign: 'center', padding: '28px 0',
                  border: `1px dashed ${theme.color.border}`,
                  borderRadius: theme.radius.md,
                }}>
                  まだ保存されたプロジェクトはありません
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.map(p => (
                    <div
                      key={p.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: 10,
                        background: theme.color.surfaceSolid,
                        border: `1px solid ${theme.color.border}`,
                        borderRadius: theme.radius.md,
                        transition: theme.transition,
                      }}
                    >
                      <button
                        onClick={() => doLoad(p)}
                        style={{
                          flex: 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          padding: 0, textAlign: 'left', minWidth: 0,
                        }}
                        title='読み込む'
                      >
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: theme.color.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          width: '100%',
                        }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: theme.color.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span><i className='fa-regular fa-clock' style={{ marginRight: 3 }} />{formatDate(p.updatedAt)}</span>
                          <span>· {p.shapes.length}シェイプ</span>
                        </div>
                      </button>
                      <IconButton
                        onClick={() => doSave(p.name, true)}
                        title='現在の状態で上書き'
                        style={{ color: theme.color.textSecondary }}
                      >
                        <i className='fa-regular fa-floppy-disk' style={{ fontSize: 12 }} />
                      </IconButton>
                      <IconButton
                        onClick={() => doDelete(p.name)}
                        title='削除'
                        style={{ color: theme.color.danger }}
                      >
                        <i className='fa-solid fa-trash' style={{ fontSize: 11 }} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionLabel>バックアップ</SectionLabel>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <Button fullWidth onClick={doExportBackup} title='全データをJSONで書き出し'>
                <i className='fa-solid fa-file-export' /> 書き出し
              </Button>
              <Button fullWidth onClick={() => fileInputRef.current?.click()} title='JSONから復元'>
                <i className='fa-solid fa-file-import' /> 読み込み
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                accept='application/json,.json'
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) doImportBackup(f, onClose);
                  e.target.value = '';
                }}
              />
            </div>
            <div style={{ fontSize: 10.5, color: theme.color.textMuted, marginTop: 6, lineHeight: 1.5 }}>
              プロジェクト・アニメーション・ローテーションを含む全データを書き出し / 復元できます。
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
