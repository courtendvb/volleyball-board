import React, { useState } from 'react';
import { theme } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '4px 8px', fontSize: 11, height: 26 },
  md: { padding: '6px 12px', fontSize: 12.5, height: 32 },
  lg: { padding: '9px 16px', fontSize: 13, height: 38 },
};

const getVariantStyles = (variant: ButtonVariant, active: boolean, hover: boolean): React.CSSProperties => {
  if (active) {
    return {
      background: theme.color.accent,
      color: '#fff',
      border: `1px solid ${theme.color.accent}`,
      boxShadow: `0 0 0 3px ${theme.color.accentSoft}`,
    };
  }
  switch (variant) {
    case 'primary':
      return {
        background: hover ? theme.color.accentHover : theme.color.accent,
        color: '#fff',
        border: '1px solid transparent',
        boxShadow: hover ? theme.shadow.md : theme.shadow.sm,
      };
    case 'danger':
      return {
        background: hover ? '#dc2626' : theme.color.danger,
        color: '#fff',
        border: '1px solid transparent',
        boxShadow: hover ? theme.shadow.md : theme.shadow.sm,
      };
    case 'success':
      return {
        background: hover ? '#059669' : theme.color.success,
        color: '#fff',
        border: '1px solid transparent',
        boxShadow: hover ? theme.shadow.md : theme.shadow.sm,
      };
    case 'ghost':
      return {
        background: hover ? theme.color.surfaceHover : 'transparent',
        color: theme.color.text,
        border: '1px solid transparent',
      };
    case 'secondary':
    default:
      return {
        background: hover ? theme.color.surfaceHover : theme.color.surfaceSolid,
        color: theme.color.text,
        border: `1px solid ${theme.color.border}`,
        boxShadow: hover ? theme.shadow.sm : 'none',
      };
  }
};

export const Button = ({
  children, onClick, variant = 'secondary', size = 'md',
  active = false, disabled = false, title, fullWidth, style,
}: ButtonProps) => {
  const [hover, setHover] = useState(false);
  const variantStyles = getVariantStyles(variant, active, hover && !disabled);

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        ...sizeStyles[size],
        ...variantStyles,
        borderRadius: theme.radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        letterSpacing: '-0.005em',
        transition: theme.transition,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: disabled ? 0.45 : 1,
        outline: 'none',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const IconButton = ({
  children, onClick, title, active, disabled, style,
}: {
  children: React.ReactNode; onClick?: () => void; title?: string;
  active?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: 30, height: 30,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? theme.color.accentSoft : hover && !disabled ? theme.color.surfaceHover : 'transparent',
        color: active ? theme.color.accent : theme.color.textSecondary,
        border: 'none',
        borderRadius: theme.radius.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        transition: theme.transition,
        opacity: disabled ? 0.35 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
};
