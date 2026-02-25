import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  elevated?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', style, elevated, onClick }: Props) {
  const baseClass = elevated ? 'ios-card-elevated' : 'ios-card';

  return (
    <div
      className={`${baseClass} ${onClick ? 'ios-card-interactive' : ''} ${className}`}
      style={{
        padding: 20,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
