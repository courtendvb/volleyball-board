import { useState, useRef } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Board } from '../hooks/useBoard';
import type Konva from 'konva';
import { theme, panelSurface } from '../ui/theme';
import { Button, IconButton } from '../ui/Button';
import { FieldLabel, Input } from '../ui/Panel';

const ANIM_STORAGE_KEY = 'v-tactics-animations-v2';

type AnimFrame = Record<string, { x: number; y: number }>;
interface SavedAnimation { frames: AnimFrame[]; duration: number; }

interface Props {
  board: Board;
  mobileVisible?: boolean;
  stageRef?: React.RefObject<Konva.Stage | null>;
}

const loadSavedAnimations = (): Record<string, SavedAnimation> => {
  try {
    const saved = localStorage.getItem(ANIM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    localStorage.removeItem(ANIM_STORAGE_KEY);
    return {};
  }
};

export const AnimationPanel = ({ board, mobileVisible, stageRef }: Props) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(isMobile);
  const [frames, setFrames] = useState<AnimFrame[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [animName, setAnimName] = useState('');
  const [duration, setDuration] = useState(800);
  const [savedAnimations, setSavedAnimations] = useState<Record<string, SavedAnimation>>(loadSavedAnimations);
  const [repeat, setRepeat] = useState(false);
  const cancelRef = useRef(false);
  const repeatRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const compositeRafRef = useRef<number | null>(null);

  const hidden = isMobile && !mobileVisible;

  const captureFrame = () => {
    const frame: AnimFrame = {};
    board.shapes
      .filter(s => (s.type === 'player' || s.type === 'ball') && (s as any).isVisible !== false)
      .forEach(s => { frame[s.id] = { x: s.x, y: s.y }; });
    if (Object.keys(frame).length === 0) return;
    setFrames(prev => [...prev, frame]);
  };

  const removeFrame = (index: number) => setFrames(prev => prev.filter((_, i) => i !== index));

  const animateToFrame = (from: AnimFrame, to: AnimFrame, dur: number): Promise<void> =>
    new Promise(resolve => {
      const t0 = Date.now();
      const ids = Object.keys(to).filter(id => from[id]);
      const step = () => {
        if (cancelRef.current) { resolve(); return; }
        const p = Math.min((Date.now() - t0) / dur, 1);
        const e = p * (2 - p);
        board.updateShapes(ids.map(id => ({
          id,
          changes: {
            x: from[id].x + (to[id].x - from[id].x) * e,
            y: from[id].y + (to[id].y - from[id].y) * e,
          },
        })));
        if (p < 1) { rafRef.current = requestAnimationFrame(step); }
        else { rafRef.current = null; resolve(); }
      };
      rafRef.current = requestAnimationFrame(step);
    });

  const playAnimation = async () => {
    if (frames.length < 2) { alert('フレームが2つ以上必要です'); return; }
    cancelRef.current = false;
    setIsPlaying(true);

    while (true) {
      const ids0 = Object.keys(frames[0]);
      board.updateShapes(ids0.map(id => ({
        id,
        changes: { x: frames[0][id].x, y: frames[0][id].y },
      })));

      for (let i = 0; i < frames.length - 1; i++) {
        if (cancelRef.current) break;
        await animateToFrame(frames[i], frames[i + 1], duration);
      }

      if (cancelRef.current || !repeatRef.current) break;
      await new Promise(r => setTimeout(r, 100));
    }
    setIsPlaying(false);
  };

  const stopAnimation = () => {
    cancelRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setIsPlaying(false);
  };

  const exportAnimation = async () => {
    if (frames.length < 2) { alert('フレームが2つ以上必要です'); return; }
    if (!stageRef?.current) { alert('ステージが見つかりません'); return; }
    if (!('MediaRecorder' in window)) {
      alert('お使いのブラウザは動画書き出しに対応していません');
      return;
    }

    const stage = stageRef.current;
    const container = stage.container();
    const konvaCanvases = Array.from(container.querySelectorAll('canvas')) as HTMLCanvasElement[];
    if (konvaCanvases.length === 0) return;

    const w = konvaCanvases[0].width;
    const h = konvaCanvases[0].height;

    const recordCanvas = document.createElement('canvas');
    recordCanvas.width = w;
    recordCanvas.height = h;
    const ctx = recordCanvas.getContext('2d')!;

    const mimeType =
      MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' :
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
      MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : null;

    if (!mimeType) {
      alert('お使いのブラウザは動画書き出しに対応していません');
      return;
    }

    setIsExporting(true);
    cancelRef.current = false;

    const stream = recordCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: mimeType.split(';')[0] });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobileDevice) {
        const win = window.open();
        if (win) {
          win.document.write(
            `<video src="${url}" controls autoplay playsinline style="max-width:100%;display:block"></video>` +
            `<p style="font-family:sans-serif;color:#555;padding:8px">長押しして「動画を保存」</p>`
          );
        }
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `animation.${ext}`;
        a.click();
      }
      URL.revokeObjectURL(url);
      setIsExporting(false);
    };

    // 合成ループ: Konvaの全レイヤーを recordCanvas に描画し続ける
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--canvas-bg').trim() || '#f0f4f8';
    const drawComposite = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
      container.querySelectorAll('canvas').forEach(c => {
        ctx.drawImage(c as HTMLCanvasElement, 0, 0, w, h);
      });
      compositeRafRef.current = requestAnimationFrame(drawComposite);
    };
    drawComposite();

    recorder.start(100);

    // アニメーション再生
    const ids0 = Object.keys(frames[0]);
    board.updateShapes(ids0.map(id => ({
      id, changes: { x: frames[0][id].x, y: frames[0][id].y },
    })));

    for (let i = 0; i < frames.length - 1; i++) {
      if (cancelRef.current) break;
      await animateToFrame(frames[i], frames[i + 1], duration);
    }

    await new Promise(r => setTimeout(r, 400));

    if (compositeRafRef.current) cancelAnimationFrame(compositeRafRef.current);
    compositeRafRef.current = null;
    recorder.stop();
  };

  const saveAnimation = () => {
    if (!animName.trim()) { alert('アニメーション名を入力してください'); return; }
    if (frames.length < 2) { alert('フレームが2つ以上必要です'); return; }
    const newSaved = { ...savedAnimations, [animName]: { frames, duration } };
    setSavedAnimations(newSaved);
    localStorage.setItem(ANIM_STORAGE_KEY, JSON.stringify(newSaved));
    setAnimName('');
  };

  const loadAnimation = (name: string) => {
    const anim = savedAnimations[name];
    if (!anim) return;
    setFrames(anim.frames);
    setDuration(anim.duration);
  };

  const deleteAnimation = (name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const newSaved = { ...savedAnimations };
    delete newSaved[name];
    setSavedAnimations(newSaved);
    localStorage.setItem(ANIM_STORAGE_KEY, JSON.stringify(newSaved));
  };

  const busy = isPlaying || isExporting;

  return (
    <div style={{
      ...panelSurface,
      position: 'fixed',
      bottom: isMobile ? 'calc(52px + env(safe-area-inset-bottom, 0px))' : 16,
      left: isMobile ? 0 : 16,
      right: isMobile ? 0 : 'auto',
      zIndex: 100,
      width: isMobile ? '100%' : 260,
      borderRadius: isMobile ? '18px 18px 0 0' : theme.radius.xl,
      overflow: 'hidden',
      color: theme.color.text,
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column',
    }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%',
          background: isExporting
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            : isPlaying
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: 'none', cursor: 'pointer',
          color: '#fff', transition: theme.transition,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={isExporting ? 'fa-solid fa-circle-notch fa-spin' : isPlaying ? 'fa-solid fa-circle-play fa-beat' : 'fa-solid fa-film'} />
          {isExporting ? '書き出し中...' : 'アニメーション'} {frames.length > 0 && !isExporting && (
            <span style={{
              fontSize: 11, background: 'rgba(255,255,255,0.25)',
              padding: '1px 8px', borderRadius: 999, fontWeight: 600,
            }}>{frames.length}F</span>
          )}
        </span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'down' : 'up'}`} style={{ fontSize: 11, opacity: 0.85 }} />
      </button>

      {isOpen && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: isMobile ? '34vh' : 'calc(100vh - 220px)', overflowY: 'auto' }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 36, padding: 8,
            background: theme.color.surfaceSunken, borderRadius: theme.radius.md,
            alignContent: 'flex-start',
          }}>
            {frames.length === 0
              ? <span style={{ fontSize: 11, color: theme.color.textMuted, margin: 'auto' }}>フレームなし</span>
              : frames.map((_, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  background: theme.color.surfaceSolid,
                  border: `1px solid ${theme.color.border}`,
                  borderRadius: theme.radius.sm,
                  fontSize: 11, fontWeight: 600, padding: '2px 4px 2px 8px', gap: 4,
                  color: theme.color.text,
                }}>
                  <span>F{i + 1}</span>
                  <button
                    onClick={() => removeFrame(i)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: theme.color.danger, padding: 0,
                      width: 16, height: 16, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <i className='fa-solid fa-xmark' />
                  </button>
                </div>
              ))
            }
          </div>

          <Button variant='primary' fullWidth onClick={captureFrame} disabled={busy}>
            <i className='fa-solid fa-camera' /> 現在の配置を記録 (F{frames.length + 1})
          </Button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
            <Button
              variant={isPlaying ? 'secondary' : 'success'}
              onClick={isPlaying ? stopAnimation : playAnimation}
              disabled={isExporting || (!isPlaying && frames.length < 2)}
            >
              <i className={isPlaying ? 'fa-solid fa-stop' : 'fa-solid fa-play'} />
              {isPlaying ? '停止' : '再生'}
            </Button>
            <Button
              onClick={exportAnimation}
              disabled={busy || frames.length < 2}
              style={{ background: theme.color.warning, color: '#fff', border: 'none' }}
            >
              <i className='fa-solid fa-video' /> 書き出し
            </Button>
            <IconButton
              onClick={() => setFrames([])}
              disabled={busy || frames.length === 0}
              title='クリア'
              style={{
                width: 38, height: 38, borderRadius: theme.radius.md,
                color: theme.color.danger,
                background: theme.color.dangerSoft,
              }}
            >
              <i className='fa-solid fa-trash' />
            </IconButton>
          </div>

          <div>
            <FieldLabel>速度 · {duration}ms</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type='range' min={300} max={2000} step={100} value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', fontSize: 11, color: theme.color.textSecondary, fontWeight: 600 }}>
                <input
                  type='checkbox'
                  checked={repeat}
                  onChange={e => { setRepeat(e.target.checked); repeatRef.current = e.target.checked; }}
                />
                繰り返し
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <Input
              value={animName}
              onChange={setAnimName}
              placeholder='名前をつけて保存'
              onKeyDown={e => e.key === 'Enter' && saveAnimation()}
            />
            <Button onClick={saveAnimation} disabled={busy} style={{ background: theme.color.warning, color: '#fff', border: 'none' }}>
              <i className='fa-regular fa-floppy-disk' /> 保存
            </Button>
          </div>

          {Object.keys(savedAnimations).length > 0 && (
            <div>
              <FieldLabel>保存済み</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.keys(savedAnimations).map(name => (
                  <div key={name} style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => loadAnimation(name)}
                      style={{
                        flex: 1,
                        background: theme.color.surfaceSolid,
                        border: `1px solid ${theme.color.border}`,
                        color: theme.color.text,
                        borderRadius: theme.radius.md,
                        padding: '6px 10px',
                        fontSize: 11.5, fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: theme.transition,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = theme.color.surfaceHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = theme.color.surfaceSolid; }}
                    >
                      <i className='fa-solid fa-play' style={{ fontSize: 9, color: theme.color.accent }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <span style={{ fontSize: 10, color: theme.color.textMuted }}>{savedAnimations[name].frames.length}F</span>
                    </button>
                    <IconButton
                      onClick={() => deleteAnimation(name)}
                      title='削除'
                      style={{ color: theme.color.danger }}
                    >
                      <i className='fa-solid fa-xmark' />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
