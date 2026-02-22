import { Schema, model, Document, type Model } from 'mongoose';

export const KPI_DATA_SOURCE = ['project', 'task', 'run', 'issue', 'cross'] as const;
export type KpiDataSource = (typeof KPI_DATA_SOURCE)[number];

export const KPI_CHART_TYPE = ['stat', 'table', 'bar', 'line', 'scatter', 'pie', 'area'] as const;
export type KpiChartType = (typeof KPI_CHART_TYPE)[number];

export const KPI_AGGREGATION = ['sum', 'avg', 'count', 'min', 'max', 'distinct_count', 'raw'] as const;
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

export interface IKpiVisualization {
  chart_type: KpiChartType;
  x_axis?: { field: string; label?: string };
  y_axes?: IKpiYAxis[];
  dimensions?: string[];
}

export interface IKpiDefinition {
  kpi_id: string;
  name: string;
  description?: string;
  data_source: KpiDataSource;
  filters?: IKpiFilter[];
  group_by?: string[];
  formula: string;
  variables: IKpiVariable[];
  visualization: IKpiVisualization;
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

const KpiVisualizationSchema = new Schema<IKpiVisualization>(
  {
    chart_type: { type: String, enum: KPI_CHART_TYPE, required: true },
    x_axis: {
      type: new Schema({ field: String, label: String }, { _id: false }),
    },
    y_axes: { type: [KpiYAxisSchema] },
    dimensions: { type: [String] },
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
    variables: { type: [KpiVariableSchema], required: true },
    visualization: { type: KpiVisualizationSchema, required: true },
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

export const KpiDefinition: Model<KpiDefinitionDocument> =
  model<KpiDefinitionDocument>('KpiDefinition', KpiDefinitionSchema);
