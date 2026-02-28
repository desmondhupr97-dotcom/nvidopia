import { useState, useMemo, useEffect } from 'react';
import { Card, Select, Segmented } from 'antd';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const PALETTE = [
  '#76B900', '#1890ff', '#ff4d4f', '#faad14', '#722ed1',
  '#13c2c2', '#eb2f96', '#52c41a', '#fa8c16', '#2f54eb',
];

const CHART_TYPES = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Area', value: 'area' },
  { label: 'Pie', value: 'pie' },
  { label: 'Radar', value: 'radar' },
];

interface MetricDef {
  key: string;
  label: string;
  scale: 'large' | 'small';
}

const AVAILABLE_METRICS: MetricDef[] = [
  { key: 'mileage', label: 'Mileage (km)', scale: 'large' },
  { key: 'cars', label: 'Cars', scale: 'small' },
  { key: 'hotlines', label: 'Hotlines', scale: 'small' },
  { key: 'builds', label: 'Builds', scale: 'small' },
  { key: 'tags', label: 'Tags', scale: 'small' },
  { key: 'avgMileage', label: 'Avg Mileage', scale: 'large' },
];

const DEFAULT_METRICS = ['mileage', 'cars', 'hotlines'];

interface PtcKpiChartProps {
  data: Array<Record<string, unknown>>;
}

export default function PtcKpiChart({ data }: PtcKpiChartProps) {
  const [chartType, setChartType] = useState('bar');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_METRICS);

  useEffect(() => {
    setSelectedMetrics(DEFAULT_METRICS);
  }, [data]);

  const metrics = useMemo(
    () => AVAILABLE_METRICS.filter((m) => selectedMetrics.includes(m.key)),
    [selectedMetrics],
  );

  const needsDualAxis = useMemo(() => {
    const hasLarge = metrics.some((m) => m.scale === 'large');
    const hasSmall = metrics.some((m) => m.scale === 'small');
    return hasLarge && hasSmall && chartType !== 'pie' && chartType !== 'radar';
  }, [metrics, chartType]);

  if (!data.length) return null;

  const metricOptions = AVAILABLE_METRICS.map((m) => ({ label: m.label, value: m.key }));

  const renderCartesian = () => {
    const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
    const renderSeries = () =>
      metrics.map((m, i) => {
        const color = PALETTE[i % PALETTE.length];
        const yAxisId = needsDualAxis && m.scale === 'small' ? 'right' : 'left';

        if (chartType === 'line') {
          return (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={color}
              yAxisId={yAxisId}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
            />
          );
        }
        if (chartType === 'area') {
          return (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              yAxisId={yAxisId}
              strokeWidth={2}
            />
          );
        }
        return (
          <Bar
            key={m.key}
            dataKey={m.key}
            name={m.label}
            fill={color}
            yAxisId={yAxisId}
            radius={[4, 4, 0, 0]}
            fillOpacity={0.85}
          />
        );
      });

    return (
      <ChartComponent data={data as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        {needsDualAxis && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />}
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e5e5ea',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Legend />
        {renderSeries()}
      </ChartComponent>
    );
  };

  const renderPie = () => {
    if (metrics.length === 0) return <BarChart data={[]} />;
    const metric = metrics[0]!;
    return (
      <PieChart>
        <Pie
          data={data as any[]}
          dataKey={metric.key}
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={110}
          label={({ name, value }) => `${name}: ${value}`}
          labelLine={{ strokeWidth: 1 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  };

  const renderRadar = () => (
    <RadarChart data={data as any[]} cx="50%" cy="50%" outerRadius={100}>
      <PolarGrid stroke="rgba(0,0,0,0.08)" />
      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
      <PolarRadiusAxis tick={{ fontSize: 10 }} />
      {metrics.map((m, i) => (
        <Radar
          key={m.key}
          name={m.label}
          dataKey={m.key}
          stroke={PALETTE[i % PALETTE.length]}
          fill={PALETTE[i % PALETTE.length]}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      ))}
      <Tooltip />
      <Legend />
    </RadarChart>
  );

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Segmented
          options={CHART_TYPES}
          value={chartType}
          onChange={(v) => setChartType(v as string)}
          size="small"
        />
        <Select
          mode="multiple"
          value={selectedMetrics}
          onChange={setSelectedMetrics}
          options={metricOptions}
          style={{ minWidth: 260 }}
          placeholder="Select metrics"
          maxTagCount="responsive"
          size="small"
        />
      </div>
      <ResponsiveContainer width="100%" height={340}>
        {chartType === 'pie' ? renderPie() : chartType === 'radar' ? renderRadar() : renderCartesian()}
      </ResponsiveContainer>
    </Card>
  );
}
