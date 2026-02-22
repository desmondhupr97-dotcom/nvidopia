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
        color: '#818cf8',
        fontWeight: 500,
        ...(mono ? { fontFamily: 'monospace' } : {}),
        ...style,
      }}
    >
      {children}
    </Link>
  );
}
