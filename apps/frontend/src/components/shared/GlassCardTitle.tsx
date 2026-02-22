interface Props {
  children: React.ReactNode;
}

export default function GlassCardTitle({ children }: Props) {
  return <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>{children}</span>;
}
