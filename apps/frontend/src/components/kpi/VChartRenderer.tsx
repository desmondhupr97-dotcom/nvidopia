import { useMemo, useRef, useEffect, useState } from 'react';
import { Card, Empty, Spin } from 'antd';

const PALETTE = [
  '#8b929a', '#60a5fa', '#34d399', '#fbbf24', '#f87171',
  '#a78bfa', '#fb923c', '#22d3ee', '#e879f9', '#4ade80',
];

const VCHART_DARK_THEME = {
  background: 'transparent',
  colorScheme: { default: PALETTE },
  series: {
    bar: { style: { fillOpacity: 0.85 } },
    line: { style: { lineWidth: 2 } },
    area: { style: { fillOpacity: 0.2 } },
    pie: { style: { stroke: 'rgba(255,255,255,0.06)', lineWidth: 1 } },
  },
  component: {
    axis: {
      domainLine: { style: { stroke: 'rgba(255,255,255,0.1)' } },
      grid: { style: { stroke: 'rgba(255,255,255,0.05)', lineDash: [3, 3] } },
      label: { style: { fill: '#505660', fontSize: 10 } },
      title: { style: { fill: '#8b929a', fontSize: 11 } },
    },
    legend: {
      item: {
        label: { style: { fill: '#8b929a', fontSize: 10 } },
      },
    },
    tooltip: {
      panel: {
        style: {
          background: 'rgba(24,25,30,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        },
      },
      titleLabel: { style: { fill: '#e4e7eb', fontSize: 11 } },
      contentLabel: { style: { fill: '#8b929a', fontSize: 10 } },
      contentValue: { style: { fill: '#e4e7eb', fontSize: 10 } },
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
      s.color = PALETTE;
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
      <Card className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (!spec || !spec.type) {
    return (
      <Card className="ios-card">
        <Empty description="Invalid VChart spec" />
      </Card>
    );
  }

  return (
    <Card
      className="ios-card"
      title={title ? <span className="font-display" style={{ fontWeight: 600 }}>{title}</span> : undefined}
    >
      <div ref={containerRef} style={{ width: '100%', height }} />
    </Card>
  );
}
