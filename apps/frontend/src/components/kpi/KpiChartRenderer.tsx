import { Card, Empty } from 'antd';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  ScatterChart, Scatter,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';

interface YFieldDef {
  key: string;
  label?: string;
  color?: string;
  axisId?: string;
}

interface ThresholdDef {
  value: number;
  label?: string;
  color?: string;
}

interface KpiChartRendererProps {
  chartType: string;
  data: Array<Record<string, unknown>>;
  xField?: string;
  yFields: YFieldDef[];
  title?: string;
  thresholds?: ThresholdDef[];
}

const PALETTE = [
  '#00f0ff', '#ff00aa', '#f0ff00', '#00ff88',
  '#aa66ff', '#ff6644', '#44ddff', '#ff44aa',
  '#88ff44', '#ffaa00',
];

const GRID_STROKE = 'rgba(0,240,255,0.06)';
const TICK_FILL = '#64748b';

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(5,5,16,0.92)',
    border: '1px solid rgba(0,240,255,0.2)',
    borderRadius: 4,
    backdropFilter: 'blur(10px)',
    color: '#e2e8f0',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    boxShadow: '0 0 20px rgba(0,240,255,0.1)',
  },
};

function resolveColor(yf: YFieldDef, idx: number): string {
  return yf.color || PALETTE[idx % PALETTE.length]!;
}

function hasRightAxis(yFields: YFieldDef[]): boolean {
  return yFields.some((y) => y.axisId === 'right');
}

function ThresholdLines({ thresholds }: { thresholds?: ThresholdDef[] }) {
  if (!thresholds || thresholds.length === 0) return null;
  return (
    <>
      {thresholds.map((t, i) => (
        <ReferenceLine
          key={i}
          y={t.value}
          yAxisId="left"
          stroke={t.color || '#ff0044'}
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{ value: t.label ?? `${t.value}`, fill: t.color || '#ff0044', fontSize: 10, position: 'right' }}
        />
      ))}
    </>
  );
}

function CartesianBase({ xField, yFields, children, thresholds }: {
  xField?: string;
  yFields: YFieldDef[];
  children: React.ReactNode;
  thresholds?: ThresholdDef[];
}) {
  const dual = hasRightAxis(yFields);
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
      <XAxis
        dataKey={xField}
        tick={{ fontSize: 11, fill: TICK_FILL }}
        stroke={GRID_STROKE}
      />
      <YAxis
        yAxisId="left"
        tick={{ fontSize: 11, fill: TICK_FILL }}
        stroke={GRID_STROKE}
      />
      {dual && (
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: TICK_FILL }}
          stroke={GRID_STROKE}
        />
      )}
      <Tooltip {...tooltipStyle} />
      <Legend />
      <ThresholdLines thresholds={thresholds} />
      {children}
    </>
  );
}

function BarChartInner({ data, xField, yFields, thresholds }: KpiChartRendererProps) {
  return (
    <BarChart data={data}>
      <CartesianBase xField={xField} yFields={yFields} thresholds={thresholds}>
        {yFields.map((yf, i) => (
          <Bar
            key={yf.key}
            dataKey={yf.key}
            name={yf.label || yf.key}
            fill={resolveColor(yf, i)}
            yAxisId={yf.axisId || 'left'}
            radius={[2, 2, 0, 0]}
            fillOpacity={0.85}
          />
        ))}
      </CartesianBase>
    </BarChart>
  );
}

function LineChartInner({ data, xField, yFields, thresholds }: KpiChartRendererProps) {
  return (
    <LineChart data={data}>
      <CartesianBase xField={xField} yFields={yFields} thresholds={thresholds}>
        {yFields.map((yf, i) => (
          <Line
            key={yf.key}
            type="monotone"
            dataKey={yf.key}
            name={yf.label || yf.key}
            stroke={resolveColor(yf, i)}
            yAxisId={yf.axisId || 'left'}
            strokeWidth={2}
            dot={{ r: 3, fill: resolveColor(yf, i) }}
            activeDot={{ r: 5, stroke: resolveColor(yf, i), filter: `drop-shadow(0 0 4px ${resolveColor(yf, i)})` }}
          />
        ))}
      </CartesianBase>
    </LineChart>
  );
}

function AreaChartInner({ data, xField, yFields, thresholds }: KpiChartRendererProps) {
  return (
    <AreaChart data={data}>
      <defs>
        {yFields.map((yf, i) => {
          const c = resolveColor(yf, i);
          return (
            <linearGradient key={yf.key} id={`areaGrad-${yf.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          );
        })}
      </defs>
      <CartesianBase xField={xField} yFields={yFields} thresholds={thresholds}>
        {yFields.map((yf, i) => (
          <Area
            key={yf.key}
            type="monotone"
            dataKey={yf.key}
            name={yf.label || yf.key}
            stroke={resolveColor(yf, i)}
            fill={`url(#areaGrad-${yf.key})`}
            yAxisId={yf.axisId || 'left'}
            strokeWidth={2}
          />
        ))}
      </CartesianBase>
    </AreaChart>
  );
}

function ScatterChartInner({ data, xField, yFields }: KpiChartRendererProps) {
  return (
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
      <XAxis
        dataKey={xField}
        name={xField}
        tick={{ fontSize: 11, fill: TICK_FILL }}
        stroke={GRID_STROKE}
      />
      <YAxis
        dataKey={yFields[0]?.key}
        name={yFields[0]?.label || yFields[0]?.key}
        tick={{ fontSize: 11, fill: TICK_FILL }}
        stroke={GRID_STROKE}
      />
      <Tooltip {...tooltipStyle} />
      <Legend />
      {yFields.map((yf, i) => (
        <Scatter
          key={yf.key}
          name={yf.label || yf.key}
          data={data}
          fill={resolveColor(yf, i)}
          fillOpacity={0.7}
        />
      ))}
    </ScatterChart>
  );
}

function PieChartInner({ data, xField, yFields }: KpiChartRendererProps) {
  const dataKey = yFields[0]?.key ?? 'value';
  return (
    <PieChart>
      <Tooltip {...tooltipStyle} />
      <Legend />
      <Pie
        data={data}
        dataKey={dataKey}
        nameKey={xField || 'name'}
        cx="50%"
        cy="50%"
        innerRadius="40%"
        outerRadius="75%"
        strokeWidth={1}
        stroke="rgba(0,240,255,0.1)"
        label={({ name, percent }: { name: string; percent: number }) =>
          `${name} ${(percent * 100).toFixed(0)}%`
        }
      >
        {data.map((_, i) => (
          <Cell key={i} fill={PALETTE[i % PALETTE.length]!} fillOpacity={0.85} />
        ))}
      </Pie>
    </PieChart>
  );
}

function GaugeChartInner({ data, yFields }: KpiChartRendererProps) {
  const value = Number(data[0]?.[yFields[0]?.key ?? 'value'] ?? 0);
  const maxVal = 100;
  const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
  const color = pct >= 80 ? '#00ff88' : pct >= 50 ? '#f0ff00' : '#ff0044';

  const gaugeData = [
    { name: 'value', value: pct },
    { name: 'remaining', value: 100 - pct },
  ];

  return (
    <PieChart>
      <Pie
        data={gaugeData}
        cx="50%"
        cy="70%"
        startAngle={180}
        endAngle={0}
        innerRadius="60%"
        outerRadius="85%"
        dataKey="value"
        strokeWidth={0}
      >
        <Cell fill={color} />
        <Cell fill="rgba(0,240,255,0.06)" />
      </Pie>
      <text x="50%" y="62%" textAnchor="middle" fill={color} style={{ fontSize: 28, fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>
        {value.toFixed(1)}
      </text>
      <text x="50%" y="78%" textAnchor="middle" fill="#64748b" style={{ fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
        {yFields[0]?.label || 'Value'}
      </text>
    </PieChart>
  );
}

function RadarChartInner({ data, xField, yFields }: KpiChartRendererProps) {
  return (
    <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
      <PolarGrid stroke={GRID_STROKE} />
      <PolarAngleAxis dataKey={xField} tick={{ fontSize: 11, fill: TICK_FILL }} />
      <PolarRadiusAxis tick={{ fontSize: 10, fill: TICK_FILL }} />
      <Tooltip {...tooltipStyle} />
      <Legend />
      {yFields.map((yf, i) => (
        <Radar
          key={yf.key}
          name={yf.label || yf.key}
          dataKey={yf.key}
          stroke={resolveColor(yf, i)}
          fill={resolveColor(yf, i)}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      ))}
    </RadarChart>
  );
}

function DualAxesChartInner({ data, xField, yFields, thresholds }: KpiChartRendererProps) {
  return (
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
      <XAxis dataKey={xField} tick={{ fontSize: 11, fill: TICK_FILL }} stroke={GRID_STROKE} />
      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: TICK_FILL }} stroke={GRID_STROKE} />
      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: TICK_FILL }} stroke={GRID_STROKE} />
      <Tooltip {...tooltipStyle} />
      <Legend />
      <ThresholdLines thresholds={thresholds} />
      {yFields.map((yf, i) => {
        const axisId = yf.axisId || (i === 0 ? 'left' : 'right');
        if (i === 0) {
          return <Bar key={yf.key} dataKey={yf.key} name={yf.label || yf.key} fill={resolveColor(yf, i)} yAxisId={axisId} radius={[2, 2, 0, 0]} fillOpacity={0.85} />;
        }
        return <Line key={yf.key} type="monotone" dataKey={yf.key} name={yf.label || yf.key} stroke={resolveColor(yf, i)} yAxisId={axisId} strokeWidth={2} dot={{ r: 3 }} />;
      })}
    </ComposedChart>
  );
}

function FunnelChartInner({ data, xField, yFields }: KpiChartRendererProps) {
  const dataKey = yFields[0]?.key ?? 'value';
  const sorted = [...data].sort((a, b) => Number(b[dataKey] ?? 0) - Number(a[dataKey] ?? 0));
  const maxVal = Number(sorted[0]?.[dataKey] ?? 1);

  return (
    <div style={{ padding: '20px 0' }}>
      {sorted.map((item, i) => {
        const val = Number(item[dataKey] ?? 0);
        const widthPct = Math.max(10, (val / maxVal) * 100);
        const color = PALETTE[i % PALETTE.length]!;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, justifyContent: 'center' }}>
            <span style={{ width: 100, textAlign: 'right', paddingRight: 12, fontSize: 12, color: TICK_FILL, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Share Tech Mono', monospace" }}>
              {String(item[xField || 'name'] ?? `Step ${i + 1}`)}
            </span>
            <div
              style={{
                width: `${widthPct}%`,
                maxWidth: 400,
                height: 28,
                background: color,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#050510',
                fontSize: 11,
                fontWeight: 700,
                opacity: 0.85,
                transition: 'width 0.3s ease',
                fontFamily: "'Share Tech Mono', monospace",
                boxShadow: `0 0 8px ${color}40`,
              }}
            >
              {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WaterfallChartInner({ data, xField, yFields, thresholds }: KpiChartRendererProps) {
  const dataKey = yFields[0]?.key ?? 'value';
  let cumulative = 0;
  const waterfallData = data.map((item) => {
    const val = Number(item[dataKey] ?? 0);
    const start = cumulative;
    cumulative += val;
    return { ...item, _wf_start: start, _wf_end: cumulative, _wf_value: val };
  });

  return (
    <BarChart data={waterfallData}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
      <XAxis dataKey={xField} tick={{ fontSize: 11, fill: TICK_FILL }} stroke={GRID_STROKE} />
      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: TICK_FILL }} stroke={GRID_STROKE} />
      <Tooltip {...tooltipStyle} />
      <Legend />
      <ThresholdLines thresholds={thresholds} />
      <Bar dataKey="_wf_start" stackId="wf" fill="transparent" yAxisId="left" />
      <Bar dataKey="_wf_value" stackId="wf" name={yFields[0]?.label || dataKey} yAxisId="left" radius={[2, 2, 0, 0]}>
        {waterfallData.map((entry, i) => (
          <Cell key={i} fill={Number(entry._wf_value) >= 0 ? '#00ff88' : '#ff0044'} fillOpacity={0.85} />
        ))}
      </Bar>
    </BarChart>
  );
}

const CHART_MAP: Record<string, React.FC<KpiChartRendererProps>> = {
  bar: BarChartInner,
  line: LineChartInner,
  area: AreaChartInner,
  scatter: ScatterChartInner,
  pie: PieChartInner,
  gauge: GaugeChartInner,
  radar: RadarChartInner,
  dual_axes: DualAxesChartInner,
  funnel: FunnelChartInner,
  waterfall: WaterfallChartInner,
};

export default function KpiChartRenderer(props: KpiChartRendererProps) {
  const { chartType, data, title } = props;
  const ChartComp = CHART_MAP[chartType];

  if (!ChartComp || !data.length) {
    return (
      <Card className="glass-panel hud-corners">
        <Empty description={data.length === 0 ? 'No data' : `Unknown chart type: ${chartType}`} />
      </Card>
    );
  }

  return (
    <Card
      className="glass-panel hud-corners"
      title={
        title ? (
          <span className="font-display" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        ) : undefined
      }
    >
      <ResponsiveContainer width="100%" height={340}>
        <ChartComp {...props} />
      </ResponsiveContainer>
    </Card>
  );
}
