import { Schema, model, Document, type Model } from 'mongoose';

export const KPI_DATA_SOURCE = ['project', 'task', 'run', 'issue', 'cross'] as const;
export type KpiDataSource = (typeof KPI_DATA_SOURCE)[number];

export const KPI_CHART_TYPE = ['stat', 'table', 'bar', 'line', 'scatter', 'pie', 'area', 'gauge', 'radar', 'dual_axes', 'funnel', 'waterfall'] as const;
export type KpiChartType = (typeof KPI_CHART_TYPE)[number];

export const KPI_AGGREGATION = ['sum', 'avg', 'count', 'min', 'max', 'distinct_count', 'raw', 'percentile_50', 'percentile_90', 'percentile_99', 'stddev'] as const;
export type KpiAggregation = (typeof KPI_AGGREGATION)[number];

export const KPI_FILTER_OPERATOR = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex'] as const;
export type KpiFilterOperator = (typeof KPI_FILTER_OPERATOR)[number];

export interface IKpiFilter {
  field: string;
  operator: KpiFilterOperator;
  value: unknown;
}

export interface IKpiVariable {
  name: string;
  source_entity: string;
  field: string;
  aggregation: KpiAggregation;
}

export interface IKpiYAxis {
  variable: string;
  label?: string;
  color?: string;
  axis_id?: 'left' | 'right';
}

export interface IKpiThreshold {
  value: number;
  label?: string;
  color?: string;
}

export interface IKpiColorRange {
  min: number;
  max: number;
  color: string;
}

export interface IKpiFormat {
  precision?: number;
  prefix?: string;
  suffix?: string;
  notation?: 'standard' | 'compact' | 'scientific';
}

export interface IKpiVisualization {
  chart_type: KpiChartType;
  x_axis?: { field: string; label?: string; type?: 'category' | 'time' };
  y_axes?: IKpiYAxis[];
  dimensions?: string[];
  thresholds?: IKpiThreshold[];
  color_ranges?: IKpiColorRange[];
  sort?: { field: string; order: 'asc' | 'desc' };
  limit?: number;
  format?: IKpiFormat;
  size?: 'small' | 'medium' | 'large';
}

export const KPI_RENDERER = ['recharts', 'vchart'] as const;
export type KpiRenderer = (typeof KPI_RENDERER)[number];

export interface IKpiDefinition {
  kpi_id: string;
  name: string;
  description?: string;
  data_source: KpiDataSource;
  filters?: IKpiFilter[];
  group_by?: string[];
  formula: string;
  formula_format?: 'mathjs';
  variables: IKpiVariable[];
  visualization: IKpiVisualization;
  vchart_spec?: Record<string, unknown>;
  renderer: KpiRenderer;
  dashboard_id?: string;
  dashboard_name?: string;
  display_order?: number;
  enabled: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export type KpiDefinitionDocument = IKpiDefinition & Document;

const KpiFilterSchema = new Schema<IKpiFilter>(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: KPI_FILTER_OPERATOR, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const KpiVariableSchema = new Schema<IKpiVariable>(
  {
    name: { type: String, required: true },
    source_entity: { type: String, required: true },
    field: { type: String, required: true },
    aggregation: { type: String, enum: KPI_AGGREGATION, required: true },
  },
  { _id: false },
);

const KpiYAxisSchema = new Schema<IKpiYAxis>(
  {
    variable: { type: String, required: true },
    label: String,
    color: String,
    axis_id: { type: String, enum: ['left', 'right'] },
  },
  { _id: false },
);

const KpiThresholdSchema = new Schema(
  { value: { type: Number, required: true }, label: String, color: String },
  { _id: false },
);

const KpiColorRangeSchema = new Schema(
  { min: { type: Number, required: true }, max: { type: Number, required: true }, color: { type: String, required: true } },
  { _id: false },
);

const KpiFormatSchema = new Schema(
  { precision: Number, prefix: String, suffix: String, notation: { type: String, enum: ['standard', 'compact', 'scientific'] } },
  { _id: false },
);

const KpiVisualizationSchema = new Schema<IKpiVisualization>(
  {
    chart_type: { type: String, enum: KPI_CHART_TYPE, required: true },
    x_axis: {
      type: new Schema({ field: String, label: String, type: { type: String, enum: ['category', 'time'] } }, { _id: false }),
    },
    y_axes: { type: [KpiYAxisSchema] },
    dimensions: { type: [String] },
    thresholds: { type: [KpiThresholdSchema], default: [] },
    color_ranges: { type: [KpiColorRangeSchema], default: [] },
    sort: { type: new Schema({ field: String, order: { type: String, enum: ['asc', 'desc'] } }, { _id: false }) },
    limit: Number,
    format: { type: KpiFormatSchema },
    size: { type: String, enum: ['small', 'medium', 'large'] },
  },
  { _id: false },
);

const KpiDefinitionSchema = new Schema<KpiDefinitionDocument>(
  {
    kpi_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    description: String,
    data_source: { type: String, enum: KPI_DATA_SOURCE, required: true },
    filters: { type: [KpiFilterSchema], default: [] },
    group_by: { type: [String], default: [] },
    formula: { type: String, required: true },
    formula_format: { type: String, enum: ['mathjs'], default: 'mathjs' },
    variables: { type: [KpiVariableSchema], required: true },
    visualization: { type: KpiVisualizationSchema, required: true },
    vchart_spec: { type: Schema.Types.Mixed },
    renderer: { type: String, enum: KPI_RENDERER, default: 'recharts' },
    dashboard_id: String,
    dashboard_name: String,
    display_order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    created_by: String,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strict: false,
  },
);

KpiDefinitionSchema.index({ kpi_id: 1 }, { unique: true });
KpiDefinitionSchema.index({ enabled: 1, display_order: 1 });
KpiDefinitionSchema.index({ data_source: 1 });
KpiDefinitionSchema.index({ dashboard_id: 1 });

export const KpiDefinition: Model<KpiDefinitionDocument> =
  model<KpiDefinitionDocument>('KpiDefinition', KpiDefinitionSchema);
