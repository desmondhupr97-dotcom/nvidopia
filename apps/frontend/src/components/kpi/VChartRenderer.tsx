import { useMemo, useRef, useEffect, useState } from 'react';
import { Card, Empty, Spin } from 'antd';

const CYBERPUNK_PALETTE = [
  '#00f0ff', '#ff00aa', '#f0ff00', '#00ff88',
  '#aa66ff', '#ff6644', '#44ddff', '#ff44aa',
  '#88ff44', '#ffaa00',
];

const VCHART_DARK_THEME = {
  background: 'transparent',
  colorScheme: { default: CYBERPUNK_PALETTE },
  series: {
    bar: { style: { fillOpacity: 0.85 } },
    line: { style: { lineWidth: 2 } },
    area: { style: { fillOpacity: 0.25 } },
    pie: { style: { stroke: 'rgba(0,240,255,0.1)', lineWidth: 1 } },
  },
  component: {
    axis: {
      domainLine: { style: { stroke: 'rgba(0,240,255,0.15)' } },
      grid: { style: { stroke: 'rgba(0,240,255,0.08)', lineDash: [3, 3] } },
      label: { style: { fill: '#64748b', fontSize: 11 } },
      title: { style: { fill: '#94a3b8', fontSize: 12 } },
    },
    legend: {
      item: {
        label: { style: { fill: '#94a3b8', fontSize: 11 } },
      },
    },
    tooltip: {
      panel: {
        style: {
          background: 'rgba(5,5,16,0.92)',
          border: '1px solid rgba(0,240,255,0.2)',
          borderRadius: '8px',
          boxShadow: '0 0 20px rgba(0,240,255,0.1)',
        },
      },
      titleLabel: { style: { fill: '#e2e8f0', fontSize: 12 } },
      contentLabel: { style: { fill: '#94a3b8', fontSize: 11 } },
      contentValue: { style: { fill: '#00f0ff', fontSize: 11 } },
    },
  },
};

interface VChartRendererProps {
  spec: Record<string, unknown>;
  data?: Array<Record<string, unknown>>;
  title?: string;
  height?: number;
  loading?: boolean;
}

type VChartInstance = { updateSpec: (s: unknown) => void; renderSync: () => void; release: () => void };
type VChartConstructor = new (spec: unknown, opts: { dom: HTMLElement }) => VChartInstance;

let VChartClass: VChartConstructor | null = null;
const loadVChart = async (): Promise<VChartConstructor> => {
  if (VChartClass) return VChartClass;
  const mod = await import('@visactor/vchart');
  VChartClass = mod.default as unknown as VChartConstructor;
  return VChartClass;
};

export default function VChartRenderer({ spec, data, title, height = 340, loading }: VChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<VChartInstance | null>(null);
  const [ready, setReady] = useState(!!VChartClass);

  useEffect(() => {
    if (!VChartClass) {
      loadVChart().then(() => setReady(true));
    }
  }, []);

  const mergedSpec = useMemo(() => {
    const s = { ...spec };

    if (data && data.length > 0) {
      if (Array.isArray(s.data)) {
        s.data = (s.data as Array<Record<string, unknown>>).map((d, i) =>
          i === 0 ? { ...d, values: data } : d,
        );
      } else if (s.data && typeof s.data === 'object') {
        s.data = { ...(s.data as Record<string, unknown>), values: data };
      } else {
        s.data = { id: 'kpiData', values: data };
      }
    }

    s.background = 'transparent';
    s.padding = s.padding ?? 12;
    s.width = undefined;
    s.height = height;

    if (!s.color) {
      s.color = CYBERPUNK_PALETTE;
    }
    s.theme = { ...VCHART_DARK_THEME };

    return s;
  }, [spec, data, height]);

  useEffect(() => {
    if (!containerRef.current || !ready || !VChartClass) return;

    if (chartRef.current) {
      chartRef.current.updateSpec(mergedSpec);
      return;
    }

    const chart = new VChartClass(mergedSpec, { dom: containerRef.current });
    chart.renderSync();
    chartRef.current = chart;

    return () => {
      chart.release();
      chartRef.current = null;
    };
  }, [mergedSpec, ready]);

  if (loading || !ready) {
    return (
      <Card className="glass-panel hud-corners">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (!spec || !spec.type) {
    return (
      <Card className="glass-panel hud-corners">
        <Empty description="Invalid VChart spec" />
      </Card>
    );
  }

  return (
    <Card
      className="glass-panel hud-corners"
      title={title ? <span className="font-display" style={{ fontWeight: 600 }}>{title}</span> : undefined}
    >
      <div ref={containerRef} style={{ width: '100%', height }} />
    </Card>
  );
}
