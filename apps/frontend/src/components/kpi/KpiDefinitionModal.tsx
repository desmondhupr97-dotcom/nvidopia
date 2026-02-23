import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, Button, Space, Divider, message, Card, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';
import {
  createKpiDefinition,
  updateKpiDefinition,
  previewKpiFormula,
  type KpiDefinition,
  type KpiEvalResult,
} from '../../api/client';
import KpiFieldPicker from './KpiFieldPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingDef?: KpiDefinition;
}

const DATA_SOURCES = [
  { value: 'project', label: 'Project' },
  { value: 'task', label: 'Task' },
  { value: 'run', label: 'Run' },
  { value: 'issue', label: 'Issue' },
  { value: 'cross', label: 'Cross-Entity' },
];

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'distinct_count', label: 'Distinct Count' },
  { value: 'raw', label: 'Raw' },
  { value: 'percentile_50', label: 'P50 (Median)' },
  { value: 'percentile_90', label: 'P90' },
  { value: 'percentile_99', label: 'P99' },
  { value: 'stddev', label: 'Std Dev' },
];

const CHART_TYPES = [
  { value: 'stat', label: 'Stat Card' },
  { value: 'table', label: 'Table' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'radar', label: 'Radar' },
  { value: 'dual_axes', label: 'Dual Axes (Bar+Line)' },
  { value: 'funnel', label: 'Funnel' },
  { value: 'waterfall', label: 'Waterfall' },
];

const FORMULA_OPERATORS = [
  { label: '+', value: ' + ', title: 'Add' },
  { label: '−', value: ' - ', title: 'Subtract' },
  { label: '×', value: ' * ', title: 'Multiply' },
  { label: '÷', value: ' / ', title: 'Divide' },
  { label: '(', value: '(', title: 'Open paren' },
  { label: ')', value: ')', title: 'Close paren' },
  { label: '√', value: 'sqrt(', title: 'Square root' },
  { label: 'x²', value: '^2', title: 'Square' },
  { label: 'pow', value: 'pow(', title: 'Power' },
  { label: 'abs', value: 'abs(', title: 'Absolute value' },
  { label: 'log', value: 'log(', title: 'Natural log' },
  { label: 'round', value: 'round(', title: 'Round' },
  { label: 'ceil', value: 'ceil(', title: 'Ceiling' },
  { label: 'floor', value: 'floor(', title: 'Floor' },
  { label: 'min', value: 'min(', title: 'Minimum' },
  { label: 'max', value: 'max(', title: 'Maximum' },
];

interface ThresholdRow {
  value: number;
  label: string;
  color: string;
}

const KPI_TEMPLATES: Array<{ name: string; template: Partial<KpiDefinition> }> = [
  {
    name: 'Issue Count by Category (Bar)',
    template: {
      name: 'Issue Count by Category',
      data_source: 'issue',
      formula: 'issue_count',
      variables: [{ name: 'issue_count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' }],
      visualization: { chart_type: 'bar', x_axis: { field: 'category' }, y_axes: [{ variable: 'value', label: 'Issues' }] },
    },
  },
  {
    name: 'Issue Severity Distribution (Pie)',
    template: {
      name: 'Issue Severity Distribution',
      data_source: 'issue',
      formula: 'severity_count',
      variables: [{ name: 'severity_count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' }],
      visualization: { chart_type: 'pie', x_axis: { field: 'severity' }, y_axes: [{ variable: 'value', label: 'Count' }] },
    },
  },
  {
    name: 'Total Mileage by Task (Bar)',
    template: {
      name: 'Total Mileage by Task',
      data_source: 'run',
      formula: 'total_km',
      variables: [{ name: 'total_km', source_entity: 'run', field: 'total_auto_mileage_km', aggregation: 'sum' }],
      visualization: { chart_type: 'bar', x_axis: { field: 'task_id' }, y_axes: [{ variable: 'value', label: 'Mileage (km)' }] },
    },
  },
  {
    name: 'Fleet Utilization Gauge',
    template: {
      name: 'Fleet Utilization',
      data_source: 'run',
      formula: 'utilization',
      variables: [{ name: 'utilization', source_entity: 'run', field: 'total_auto_mileage_km', aggregation: 'avg' }],
      visualization: { chart_type: 'gauge', y_axes: [{ variable: 'value', label: 'Utilization %' }] },
    },
  },
];

const AXIS_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontWeight: 500,
};

interface VarRow {
  name: string;
  source_entity: string;
  field: string;
  aggregation: string;
}

interface YAxisRow {
  variable: string;
  label: string;
  color: string;
  axis_id: string;
}

function emptyVar(): VarRow {
  return { name: '', source_entity: '', field: '', aggregation: 'count' };
}

function emptyYAxis(): YAxisRow {
  return { variable: '', label: '', color: '', axis_id: 'left' };
}

export default function KpiDefinitionModal({ open, onClose, onSaved, editingDef }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<KpiEvalResult | null>(null);

  const [variables, setVariables] = useState<VarRow[]>([emptyVar()]);
  const [yAxes, setYAxes] = useState<YAxisRow[]>([emptyYAxis()]);
  const [dataSource, setDataSource] = useState('issue');
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editingDef) {
      form.setFieldsValue({
        name: editingDef.name,
        description: editingDef.description,
        data_source: editingDef.data_source,
        formula: editingDef.formula,
        chart_type: editingDef.visualization.chart_type,
        x_axis_field: editingDef.visualization.x_axis?.field,
      });
      setDataSource(editingDef.data_source);
      setVariables(
        editingDef.variables.length > 0
          ? editingDef.variables.map((v) => ({ ...v }))
          : [emptyVar()],
      );
      setYAxes(
        editingDef.visualization.y_axes && editingDef.visualization.y_axes.length > 0
          ? editingDef.visualization.y_axes.map((y) => ({
              variable: y.variable,
              label: y.label ?? '',
              color: y.color ?? '',
              axis_id: y.axis_id ?? 'left',
            }))
          : [emptyYAxis()],
      );
      setThresholds(
        (editingDef.visualization as any).thresholds?.map((t: any) => ({ value: t.value, label: t.label ?? '', color: t.color ?? '#ef4444' })) ?? [],
      );
    } else {
      form.resetFields();
      setVariables([emptyVar()]);
      setYAxes([emptyYAxis()]);
      setThresholds([]);
      setDataSource('issue');
      setPreviewResult(null);
    }
  }, [open, editingDef, form]);

  const updateVar = (idx: number, patch: Partial<VarRow>) => {
    setVariables((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVar = (idx: number) => {
    setVariables((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const updateYAxis = (idx: number, patch: Partial<YAxisRow>) => {
    setYAxes((prev) => prev.map((y, i) => (i === idx ? { ...y, ...patch } : y)));
  };

  const removeYAxis = (idx: number) => {
    setYAxes((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const buildPayload = (): Partial<KpiDefinition> => {
    const vals = form.getFieldsValue();
    return {
      name: vals.name,
      description: vals.description,
      data_source: vals.data_source,
      formula: vals.formula,
      variables: variables.filter((v) => v.name && v.field),
      visualization: {
        chart_type: vals.chart_type || 'stat',
        x_axis: vals.x_axis_field ? { field: vals.x_axis_field } : undefined,
        y_axes: yAxes
          .filter((y) => y.variable)
          .map((y) => ({
            variable: y.variable,
            label: y.label || undefined,
            color: y.color || undefined,
            axis_id: y.axis_id || undefined,
          })),
        thresholds: thresholds.length > 0 ? thresholds.filter((t) => t.value != null).map((t) => ({ value: t.value, label: t.label || undefined, color: t.color || '#ef4444' })) : undefined,
        format: vals.format_suffix ? { suffix: vals.format_suffix, precision: vals.format_precision } : undefined,
      },
      enabled: true,
    };
  };

  const handlePreview = async () => {
    try {
      const vals = form.getFieldsValue();
      if (!vals.formula) {
        message.warning('Enter a formula first');
        return;
      }
      setPreviewing(true);
      const result = await previewKpiFormula({
        formula: vals.formula,
        variables: variables.filter((v) => v.name && v.field),
      });
      setPreviewResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Preview failed';
      message.error(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      setSaving(true);
      const payload = buildPayload();
      if (editingDef) {
        await updateKpiDefinition(editingDef.kpi_id, payload);
        message.success('KPI definition updated');
      } else {
        await createKpiDefinition(payload);
        message.success('KPI definition created');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      const msg = err instanceof Error ? err.message : 'Save failed';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span className="font-display" style={{ fontWeight: 600 }}>
          {editingDef ? 'Edit KPI Definition' : 'New KPI Definition'}
        </span>
      }
      width={780}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            icon={<ExperimentOutlined />}
            onClick={handlePreview}
            loading={previewing}
          >
            Preview
          </Button>
          <Button type="primary" onClick={handleSave} loading={saving}>
            {editingDef ? 'Update' : 'Create'}
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        {!editingDef && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...labelStyle, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Quick Start from Template</div>
            <Space wrap size={[6, 6]}>
              {KPI_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.name}
                  size="small"
                  onClick={() => {
                    const t = tpl.template;
                    form.setFieldsValue({
                      name: t.name, data_source: t.data_source, formula: t.formula,
                      chart_type: t.visualization?.chart_type,
                      x_axis_field: t.visualization?.x_axis?.field,
                    });
                    if (t.data_source) setDataSource(t.data_source);
                    if (t.variables) setVariables(t.variables.map((v) => ({ ...v })));
                    if (t.visualization?.y_axes) setYAxes(t.visualization.y_axes.map((y) => ({ variable: y.variable ?? '', label: y.label ?? '', color: y.color ?? '', axis_id: y.axis_id ?? 'left' })));
                  }}
                >
                  {tpl.name}
                </Button>
              ))}
            </Space>
          </div>
        )}
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="name"
              label={<span style={labelStyle}>Name</span>}
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input placeholder="e.g. Issue Resolution Rate" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="data_source"
              label={<span style={labelStyle}>Data Source</span>}
              rules={[{ required: true }]}
              initialValue="issue"
            >
              <Select
                options={DATA_SOURCES}
                onChange={(v) => setDataSource(v)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label={<span style={labelStyle}>Description</span>}
        >
          <Input.TextArea rows={2} placeholder="What does this KPI measure?" />
        </Form.Item>

        <Divider titlePlacement="left" style={{ ...labelStyle, fontSize: 13 }}>
          Variables
        </Divider>

        {variables.map((v, idx) => (
          <Card
            key={idx}
            size="small"
            className="glass-panel"
            style={{ marginBottom: 12 }}
            extra={
              variables.length > 1 && (
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => removeVar(idx)}
                />
              )
            }
          >
            <Row gutter={12}>
              <Col span={5}>
                <Input
                  placeholder="Variable name"
                  value={v.name}
                  onChange={(e) => updateVar(idx, { name: e.target.value })}
                />
              </Col>
              <Col span={5}>
                <Select
                  value={v.source_entity || undefined}
                  onChange={(val) => updateVar(idx, { source_entity: val, field: '' })}
                  placeholder="Entity"
                  options={DATA_SOURCES}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={8}>
                <KpiFieldPicker
                  entity={v.source_entity || dataSource}
                  value={v.field}
                  onChange={(field) => updateVar(idx, { field })}
                />
              </Col>
              <Col span={6}>
                <Select
                  value={v.aggregation}
                  onChange={(val) => updateVar(idx, { aggregation: val })}
                  options={AGGREGATIONS}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
          </Card>
        ))}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setVariables((prev) => [...prev, emptyVar()])}
          block
          style={{ marginBottom: 16 }}
        >
          Add Variable
        </Button>

        <Form.Item
          name="formula"
          label={<span style={labelStyle}>Formula</span>}
          rules={[{ required: true, message: 'Formula is required' }]}
          extra={
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Reference variables by name, e.g. closed_count / total_count * 100
            </span>
          }
        >
          <Input.TextArea
            rows={2}
            placeholder="closed_count / total_count * 100"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <div style={{ ...labelStyle, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Operator Palette</div>
          <Space wrap size={[4, 4]}>
            {FORMULA_OPERATORS.map((op) => (
              <Button
                key={op.value}
                size="small"
                title={op.title}
                style={{ fontFamily: 'monospace', minWidth: 36 }}
                onClick={() => {
                  const current = form.getFieldValue('formula') || '';
                  form.setFieldsValue({ formula: current + op.value });
                }}
              >
                {op.label}
              </Button>
            ))}
            {variables.filter((v) => v.name).map((v) => (
              <Button
                key={`var-${v.name}`}
                size="small"
                type="dashed"
                style={{ fontFamily: 'monospace', color: '#00FF41' }}
                onClick={() => {
                  const current = form.getFieldValue('formula') || '';
                  form.setFieldsValue({ formula: current + v.name });
                }}
              >
                {v.name}
              </Button>
            ))}
          </Space>
        </div>

        <Divider titlePlacement="left" style={{ ...labelStyle, fontSize: 13 }}>
          Visualization
        </Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="chart_type"
              label={<span style={labelStyle}>Chart Type</span>}
              initialValue="stat"
            >
              <Select options={CHART_TYPES} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="x_axis_field"
              label={<span style={labelStyle}>X-Axis Field</span>}
            >
              <Input placeholder="e.g. date, category, status" />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ ...labelStyle, fontSize: 13, marginBottom: 8 }}>Y-Axes</div>
        {yAxes.map((y, idx) => (
          <Card
            key={idx}
            size="small"
            className="glass-panel"
            style={{ marginBottom: 12 }}
            extra={
              yAxes.length > 1 && (
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => removeYAxis(idx)}
                />
              )
            }
          >
            <Row gutter={12}>
              <Col span={7}>
                <Input
                  placeholder="Variable ref"
                  value={y.variable}
                  onChange={(e) => updateYAxis(idx, { variable: e.target.value })}
                />
              </Col>
              <Col span={7}>
                <Input
                  placeholder="Label"
                  value={y.label}
                  onChange={(e) => updateYAxis(idx, { label: e.target.value })}
                />
              </Col>
              <Col span={5}>
                <Input
                  placeholder="#6366f1"
                  value={y.color}
                  onChange={(e) => updateYAxis(idx, { color: e.target.value })}
                />
              </Col>
              <Col span={5}>
                <Select
                  value={y.axis_id}
                  onChange={(val) => updateYAxis(idx, { axis_id: val })}
                  options={AXIS_OPTIONS}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
          </Card>
        ))}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setYAxes((prev) => [...prev, emptyYAxis()])}
          block
          style={{ marginBottom: 16 }}
        >
          Add Y-Axis
        </Button>

        <div style={{ ...labelStyle, fontSize: 13, marginBottom: 8 }}>Thresholds (Reference Lines)</div>
        {thresholds.map((t, idx) => (
          <Card key={idx} size="small" className="glass-panel" style={{ marginBottom: 8 }}>
            <Row gutter={8}>
              <Col span={8}><Input type="number" placeholder="Value" value={t.value} onChange={(e) => { const copy = [...thresholds]; copy[idx] = { ...copy[idx]!, value: Number(e.target.value) }; setThresholds(copy); }} /></Col>
              <Col span={8}><Input placeholder="Label" value={t.label} onChange={(e) => { const copy = [...thresholds]; copy[idx] = { ...copy[idx]!, label: e.target.value }; setThresholds(copy); }} /></Col>
              <Col span={5}><Input placeholder="#ef4444" value={t.color} onChange={(e) => { const copy = [...thresholds]; copy[idx] = { ...copy[idx]!, color: e.target.value }; setThresholds(copy); }} /></Col>
              <Col span={3}><Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setThresholds(thresholds.filter((_, i) => i !== idx))} /></Col>
            </Row>
          </Card>
        ))}
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => setThresholds([...thresholds, { value: 0, label: '', color: '#ef4444' }])} style={{ marginBottom: 16 }}>
          Add Threshold
        </Button>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Form.Item name="format_suffix" label={<span style={labelStyle}>Unit Suffix</span>}>
              <Input placeholder="%, km, hours" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="format_precision" label={<span style={labelStyle}>Precision</span>}>
              <Select options={[{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]} placeholder="Auto" allowClear />
            </Form.Item>
          </Col>
        </Row>

        {previewResult && (
          <>
            <Divider titlePlacement="left" style={{ ...labelStyle, fontSize: 13 }}>
              Preview Result
            </Divider>
            <Card size="small" className="glass-panel">
              {previewResult.error ? (
                <span style={{ color: 'var(--danger)' }}>{previewResult.error}</span>
              ) : (
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", color: 'var(--text-muted)', marginRight: 8 }}>
                    Value:
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18, color: '#00FF41' }}>
                    {previewResult.value != null ? previewResult.value.toLocaleString() : '\u2014'}
                  </span>
                  {previewResult.groups && previewResult.groups.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {previewResult.groups.length} group(s) returned
                    </div>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </Form>
    </Modal>
  );
}
