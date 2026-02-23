interface Props {
  children: React.ReactNode;
}

export default function GlassCardTitle({ children }: Props) {
  return <span className="font-display" style={{ fontWeight: 600 }}>{children}</span>;
}
