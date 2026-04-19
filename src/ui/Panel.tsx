import React, { useState } from 'react';
import { theme, panelSurface } from './theme';

interface PanelProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  onClose?: () => void;
  extra?: React.ReactNode;
  position: React.CSSProperties;
  width?: number | string;
  maxHeight?: string;
  collapsible?: boolean;
  collapsedIcon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Panel = ({
  children, title, onClose, extra, position, width = 260,
  maxHeight = 'calc(100vh - 32px)', collapsible, collapsedIcon, style,
}: PanelProps) => {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed && collapsible) {
    return (
      <div style={{ position: 'fixed', zIndex: 100, ...position }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            ...panelSurface,
            width: 40, height: 40, borderRadius: theme.radius.lg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: theme.color.text,
            transition: theme.transition,
          }}
          title='開く'
        >
          {collapsedIcon ?? '☰'}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      ...panelSurface,
      position: 'fixed',
      zIndex: 100,
      width,
      maxHeight,
      borderRadius: theme.radius.xl,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      overflowY: 'auto',
      color: theme.color.text,
      boxSizing: 'border-box',
      ...position,
      ...style,
    }}>
      {(title || onClose || extra) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          {title && (
            <div style={{
              fontSize: 13, fontWeight: 700, color: theme.color.text,
              letterSpacing: '-0.01em',
            }}>
              {title}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
            {extra}
            {collapsible && (
              <button
                onClick={() => setCollapsed(true)}
                style={{
                  width: 26, height: 26, borderRadius: theme.radius.sm,
                  border: 'none', background: 'transparent',
                  color: theme.color.textMuted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: theme.transition, fontSize: 14,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.color.surfaceHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                title='閉じる'
              >
                <i className='fa-solid fa-xmark' />
              </button>
            )}
            {onClose && !collapsible && (
              <button
                onClick={onClose}
                style={{
                  width: 26, height: 26, borderRadius: theme.radius.sm,
                  border: 'none', background: 'transparent',
                  color: theme.color.textMuted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: theme.transition,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.color.surfaceHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <i className='fa-solid fa-xmark' />
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: theme.color.textMuted,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    margin: '2px 0',
  }}>
    {children}
  </div>
);

export const Divider = () => (
  <div style={{ height: 1, background: theme.color.border, margin: '2px 0' }} />
);

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, fontWeight: 500, color: theme.color.textSecondary,
    marginBottom: 4,
  }}>
    {children}
  </div>
);

export const Input = ({
  value, onChange, placeholder, style, onKeyDown, type = 'text',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  style?: React.CSSProperties; onKeyDown?: (e: React.KeyboardEvent) => void;
  type?: string;
}) => {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onKeyDown={onKeyDown}
      style={{
        background: theme.color.surfaceSunken,
        color: theme.color.text,
        border: `1px solid ${focus ? theme.color.accent : 'transparent'}`,
        boxShadow: focus ? `0 0 0 3px ${theme.color.accentSoft}` : 'none',
        borderRadius: theme.radius.md,
        padding: '7px 10px',
        fontSize: 12.5,
        width: '100%',
        outline: 'none',
        boxSizing: 'border-box',
        transition: theme.transition,
        ...style,
      }}
    />
  );
};

export const Select = ({
  value, onChange, children, style,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
  style?: React.CSSProperties;
}) => {
  const [focus, setFocus] = useState(false);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        background: theme.color.surfaceSunken,
        color: theme.color.text,
        border: `1px solid ${focus ? theme.color.accent : 'transparent'}`,
        boxShadow: focus ? `0 0 0 3px ${theme.color.accentSoft}` : 'none',
        borderRadius: theme.radius.md,
        padding: '7px 10px',
        fontSize: 12.5,
        width: '100%',
        cursor: 'pointer',
        outline: 'none',
        boxSizing: 'border-box',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28,
        transition: theme.transition,
        ...style,
      }}
    >
      {children}
    </select>
  );
};
