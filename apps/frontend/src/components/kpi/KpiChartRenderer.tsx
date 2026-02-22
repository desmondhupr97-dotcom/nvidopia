import { Card, Empty } from 'antd';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  ScatterChart, Scatter,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface YFieldDef {
  key: string;
  label?: string;
  color?: string;
  axisId?: string;
}

interface KpiChartRendererProps {
  chartType: string;
  data: Array<Record<string, unknown>>;
  xField?: string;
  yFields: YFieldDef[];
  title?: string;
}

const PALETTE = [
  '#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6',
  '#ec4899', '#14b8a6', '#ef4444', '#a855f7', '#06b6d4',
];

const GRID_STROKE = 'rgba(255,255,255,0.06)';
const TICK_FILL = '#64748b';

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(15,22,42,0.92)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    backdropFilter: 'blur(10px)',
    color: '#e2e8f0',
    fontFamily: "'Exo 2', sans-serif",
    fontSize: 12,
  },
};

function resolveColor(yf: YFieldDef, idx: number): string {
  return yf.color || PALETTE[idx % PALETTE.length]!;
}

function hasRightAxis(yFields: YFieldDef[]): boolean {
  return yFields.some((y) => y.axisId === 'right');
}

function CartesianBase({ xField, yFields, children }: {
  xField?: string;
  yFields: YFieldDef[];
  children: React.ReactNode;
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
      {children}
    </>
  );
}

function BarChartInner({ data, xField, yFields }: KpiChartRendererProps) {
  return (
    <BarChart data={data}>
      <CartesianBase xField={xField} yFields={yFields}>
        {yFields.map((yf, i) => (
          <Bar
            key={yf.key}
            dataKey={yf.key}
            name={yf.label || yf.key}
            fill={resolveColor(yf, i)}
            yAxisId={yf.axisId || 'left'}
            radius={[4, 4, 0, 0]}
            fillOpacity={0.85}
          />
        ))}
      </CartesianBase>
    </BarChart>
  );
}

function LineChartInner({ data, xField, yFields }: KpiChartRendererProps) {
  return (
    <LineChart data={data}>
      <CartesianBase xField={xField} yFields={yFields}>
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
            activeDot={{ r: 5 }}
          />
        ))}
      </CartesianBase>
    </LineChart>
  );
}

function AreaChartInner({ data, xField, yFields }: KpiChartRendererProps) {
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
      <CartesianBase xField={xField} yFields={yFields}>
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
        stroke="rgba(255,255,255,0.08)"
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

const CHART_MAP: Record<string, React.FC<KpiChartRendererProps>> = {
  bar: BarChartInner,
  line: LineChartInner,
  area: AreaChartInner,
  scatter: ScatterChartInner,
  pie: PieChartInner,
};

export default function KpiChartRenderer(props: KpiChartRendererProps) {
  const { chartType, data, title } = props;
  const ChartComp = CHART_MAP[chartType];

  if (!ChartComp || !data.length) {
    return (
      <Card className="glass-panel">
        <Empty description={data.length === 0 ? 'No data' : `Unknown chart type: ${chartType}`} />
      </Card>
    );
  }

  return (
    <Card
      className="glass-panel"
      title={
        title ? (
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>{title}</span>
        ) : undefined
      }
    >
      <ResponsiveContainer width="100%" height={340}>
        <ChartComp {...props} />
      </ResponsiveContainer>
    </Card>
  );
}
