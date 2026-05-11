import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'gold';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  warning: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  error:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  info:    { bg: '#eff6ff', text: '#1434cb', border: '#bfdbfe' },
  neutral: { bg: '#f0f3fb', text: '#4a5578', border: '#dde3f5' },
  gold:    { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
};

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
}
