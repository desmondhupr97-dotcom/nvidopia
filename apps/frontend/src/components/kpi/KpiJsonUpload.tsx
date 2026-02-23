import { useState, useCallback } from 'react';
import { Modal, Upload, Button, Alert, Space, Typography, Tag, Collapse, message } from 'antd';
import { Upload as UploadIcon, FileJson, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importKpiDashboards, type BatchImportResult } from '../../api/client';

const { Text } = Typography;
const { Dragger } = Upload;

const SAMPLE_JSON = {
  dashboards: [
    {
      dashboard_id: 'demo-quality',
      name: 'Quality Metrics',
      description: 'Issue quality analysis dashboard',
      kpis: [
        {
          name: 'Issues by Severity',
          data_source: 'issue',
          variables: [
            { name: 'count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' },
          ],
          formula: 'count',
          group_by: ['severity'],
          vchart_spec: {
            type: 'pie',
            categoryField: 'severity',
            valueField: 'value',
            legends: { visible: true, orient: 'right' },
            label: { visible: true },
          },
        },
        {
          name: 'Issues by Category (Bar)',
          data_source: 'issue',
          variables: [
            { name: 'total', source_entity: 'issue', field: 'issue_id', aggregation: 'count' },
          ],
          formula: 'total',
          group_by: ['category'],
          vchart_spec: {
            type: 'bar',
            xField: 'category',
            yField: 'value',
            label: { visible: true, position: 'top' },
          },
        },
        {
          name: 'Issue Status Distribution',
          data_source: 'issue',
          variables: [
            { name: 'cnt', source_entity: 'issue', field: 'issue_id', aggregation: 'count' },
          ],
          formula: 'cnt',
          group_by: ['status'],
          vchart_spec: {
            type: 'rose',
            categoryField: 'status',
            valueField: 'value',
            legends: { visible: true },
          },
        },
      ],
    },
    {
      dashboard_id: 'demo-fleet',
      name: 'Fleet Analytics',
      kpis: [
        {
          name: 'Mileage by Task Type',
          data_source: 'run',
          variables: [
            { name: 'mileage', source_entity: 'run', field: 'total_auto_mileage_km', aggregation: 'sum' },
          ],
          formula: 'mileage',
          group_by: ['status'],
          vchart_spec: {
            type: 'bar',
            xField: 'status',
            yField: 'value',
            seriesField: 'status',
            label: { visible: true },
          },
        },
      ],
    },
  ],
};

interface KpiJsonUploadProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedPayload {
  raw: unknown;
  dashboardCount: number;
  totalKpis: number;
  dashboards: Array<{ id: string; name: string; kpiCount: number }>;
}

export default function KpiJsonUpload({ open, onClose, onImported }: KpiJsonUploadProps) {
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  const importMut = useMutation({
    mutationFn: (data: unknown) => importKpiDashboards(data),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] });
      message.success(`Imported ${result.summary.created} KPIs, updated ${result.summary.updated}`);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Import failed');
    },
  });

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setParsed(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.dashboards || !Array.isArray(json.dashboards)) {
          setParseError('JSON must contain a "dashboards" array at the top level.');
          return;
        }
        const dashboards = json.dashboards.map((d: any) => ({
          id: d.dashboard_id ?? '(unnamed)',
          name: d.name ?? '(unnamed)',
          kpiCount: Array.isArray(d.kpis) ? d.kpis.length : 0,
        }));
        setParsed({
          raw: json,
          dashboardCount: json.dashboards.length,
          totalKpis: dashboards.reduce((s: number, d: any) => s + d.kpiCount, 0),
          dashboards,
        });
      } catch {
        setParseError('Invalid JSON file. Please check the syntax.');
      }
    };
    reader.readAsText(file);
    return false;
  }, []);

  const handleDownloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_JSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kpi-dashboard-example.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setParsed(null);
    setParseError(null);
    setImportResult(null);
    onClose();
  };

  const handleConfirmImport = () => {
    if (parsed?.raw) {
      importMut.mutate(parsed.raw);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <FileJson size={16} style={{ color: '#00FF41' }} />
          <span className="font-display" style={{ fontWeight: 600 }}>Import KPI Dashboards</span>
        </Space>
      }
      onCancel={handleClose}
      width={640}
      footer={
        importResult ? (
          <Button type="primary" onClick={() => { handleClose(); onImported(); }}>
            Done
          </Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleConfirmImport}
              disabled={!parsed || importMut.isPending}
              loading={importMut.isPending}
            >
              Import {parsed ? `(${parsed.totalKpis} KPIs)` : ''}
            </Button>
          </Space>
        )
      }
    >
      {!importResult && (
        <>
          <Dragger
            accept=".json"
            showUploadList={false}
            beforeUpload={handleFile}
            style={{
              background: 'rgba(0,255,65,0.02)',
              borderColor: 'rgba(0,255,65,0.12)',
              borderStyle: 'dashed',
              borderRadius: 2,
            }}
          >
            <div style={{ padding: '20px 0' }}>
              <UploadIcon size={32} style={{ color: '#00FF41', marginBottom: 10 }} />
              <p style={{ color: '#b8d4b8', fontSize: 12, marginBottom: 4 }}>
                Drop JSON file here or click to browse
              </p>
              <p style={{ color: '#3d6b3d', fontSize: 11 }}>
                Supports batch import of multiple dashboards with VChart specs
              </p>
            </div>
          </Dragger>

          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button
              type="link"
              size="small"
              icon={<Download size={12} />}
              onClick={handleDownloadSample}
              style={{ color: '#00FF41', fontSize: 11 }}
            >
              Download sample JSON
            </Button>
          </div>

          {parseError && (
            <Alert
              type="error"
              showIcon
              icon={<XCircle size={16} />}
              message={parseError}
              style={{ marginTop: 12 }}
            />
          )}

          {parsed && (
            <div style={{ marginTop: 16 }}>
              <Alert
                type="success"
                showIcon
                icon={<CheckCircle2 size={16} />}
                message={`Parsed ${parsed.dashboardCount} dashboard(s), ${parsed.totalKpis} KPI(s)`}
              />
              <Collapse
                ghost
                style={{ marginTop: 8 }}
                items={parsed.dashboards.map((d) => ({
                  key: d.id,
                  label: (
                    <Space>
                      <Text style={{ color: '#b8d4b8' }}>{d.name}</Text>
                      <Tag color="cyan">{d.kpiCount} KPIs</Tag>
                    </Space>
                  ),
                  children: (
                    <Text style={{ color: '#3d6b3d', fontSize: 11 }}>
                      Dashboard ID: <code>{d.id}</code>
                    </Text>
                  ),
                }))}
              />
            </div>
          )}
        </>
      )}

      {importResult && (
        <div>
          <Alert
            type={importResult.summary.failed > 0 ? 'warning' : 'success'}
            showIcon
            icon={importResult.summary.failed > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            message={`Created: ${importResult.summary.created}, Updated: ${importResult.summary.updated}, Failed: ${importResult.summary.failed}`}
          />
          {importResult.results.map((r) => (
            <div key={r.dashboard_id} style={{ marginTop: 12 }}>
              <Text strong style={{ color: '#b8d4b8' }}>{r.dashboard_id}</Text>
              <div style={{ marginLeft: 12, marginTop: 4 }}>
                {r.created.length > 0 && (
                  <div>
                    {r.created.map((id) => (
                      <Tag key={id} color="green">{id}</Tag>
                    ))}
                  </div>
                )}
                {r.failed.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {r.failed.map((f, i) => (
                      <Alert
                        key={i}
                        type="error"
                        message={`${f.name}: ${f.error}`}
                        style={{ marginBottom: 4, fontSize: 12 }}
                        banner
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
