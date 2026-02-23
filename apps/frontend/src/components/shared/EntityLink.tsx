import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';

interface Props {
  to: string;
  children: React.ReactNode;
  mono?: boolean;
  style?: CSSProperties;
}

export default function EntityLink({ to, children, mono, style }: Props) {
  return (
    <Link
      to={to}
      style={{
        color: 'var(--text-primary)',
        fontWeight: 500,
        transition: 'color 0.2s ease',
        ...(mono ? { fontFamily: 'var(--font-mono)' } : {}),
        ...style,
      }}
    >
      {children}
    </Link>
  );
}
