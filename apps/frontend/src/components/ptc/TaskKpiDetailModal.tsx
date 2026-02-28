import { useMemo } from 'react';
import { Modal, Tabs, Table, Button, Spin, Empty } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { usePtcTaskKpi } from '../../hooks/usePtcApi';
import type { KpiByAttributeRow, KpiByOddRow } from '../../api/client';

interface TaskKpiDetailModalProps {
  taskId: string | null;
  taskName?: string;
  open: boolean;
  onClose: () => void;
}

function downloadCsv(rows: Array<Record<string, string>>, filename: string) {
  if (rows.length === 0) return;
  const first = rows[0];
  if (!first) return;
  const headers = Object.keys(first);
  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? '';
        return v.includes(',') || v.includes('"') || v.includes('\n')
          ? `"${v.replace(/"/g, '""')}"`
          : v;
      }).join(','),
    ),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface MergedRow {
  _rowSpan: number;
  [key: string]: unknown;
}

function computeMergedRows<T extends object>(
  rows: T[],
  groupKey: keyof T,
): Array<T & { _rowSpan: number }> {
  const result: Array<T & { _rowSpan: number }> = [];
  let prevVal: unknown = null;
  let spanStart = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const merged = { ...row, _rowSpan: 0 };
    if (row[groupKey] !== prevVal) {
      if (spanStart >= 0 && result[spanStart]) {
        result[spanStart]!._rowSpan = i - spanStart;
      }
      spanStart = i;
      prevVal = row[groupKey];
      merged._rowSpan = 1;
    }
    result.push(merged);
  }
  if (spanStart >= 0 && result[spanStart]) {
    result[spanStart]!._rowSpan = rows.length - spanStart;
  }
  return result;
}

function mergedFirstCol(cols: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const copy = [...cols];
  copy[0] = {
    ...copy[0],
    onCell: (record: MergedRow) => ({
      rowSpan: record._rowSpan,
      style: record._rowSpan === 0 ? { display: 'none' } : undefined,
    }),
  };
  return copy;
}

const BASE_ATTR_COLS = [
  { title: 'KPI', dataIndex: 'kpi_category', key: 'kpi_category', width: 120 },
  { title: 'Attribute', dataIndex: 'attribute', key: 'attribute', width: 100 },
  { title: 'KPI Item', dataIndex: 'kpi_item', key: 'kpi_item', width: 220 },
  { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 60 },
  { title: 'Target', dataIndex: 'target', key: 'target', width: 80 },
  { title: 'DefineBaseline', dataIndex: 'define_baseline', key: 'define_baseline', width: 110 },
  { title: 'KPI Normalized', dataIndex: 'kpi_normalized', key: 'kpi_normalized', width: 130 },
  { title: 'GVS Group Normalized', dataIndex: 'gvs_group_normalized', key: 'gvs_group_normalized', width: 150 },
  { title: 'Total', dataIndex: 'total', key: 'total', width: 100 },
  { title: 'GVS Group', dataIndex: 'gvs_group', key: 'gvs_group', width: 140 },
];

const BASE_ODD_COLS = [
  { title: 'ODD', dataIndex: 'odd', key: 'odd', width: 100 },
  { title: 'KPI Item', dataIndex: 'kpi_item', key: 'kpi_item', width: 250 },
  { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 100 },
  { title: 'Target', dataIndex: 'target', key: 'target', width: 100 },
  { title: 'Define', dataIndex: 'define', key: 'define', width: 80 },
  { title: 'Baseline', dataIndex: 'baseline', key: 'baseline', width: 80 },
  { title: 'KPI Normalized', dataIndex: 'kpi_normalized', key: 'kpi_normalized', width: 140 },
  { title: 'GVS Group Normalized', dataIndex: 'gvs_group_normalized', key: 'gvs_group_normalized', width: 150 },
  { title: 'Total', dataIndex: 'total', key: 'total', width: 100 },
  { title: 'GVS Group', dataIndex: 'gvs_group', key: 'gvs_group', width: 140 },
];

export default function TaskKpiDetailModal({ taskId, taskName, open, onClose }: TaskKpiDetailModalProps) {
  const { data, isLoading } = usePtcTaskKpi(taskId ?? '', open && !!taskId);

  const byAttrMerged = useMemo(
    () => (data?.byAttribute ? computeMergedRows(data.byAttribute, 'kpi_category') : []),
    [data],
  );

  const byOddMerged = useMemo(
    () => (data?.byODD ? computeMergedRows(data.byODD, 'odd') : []),
    [data],
  );

  const attrColumns = useMemo(() => mergedFirstCol(BASE_ATTR_COLS), []);
  const oddColumns = useMemo(() => mergedFirstCol(BASE_ODD_COLS), []);

  const handleDownloadAttr = () => {
    if (!data?.byAttribute) return;
    downloadCsv(
      data.byAttribute.map((r: KpiByAttributeRow) => ({
        KPI: r.kpi_category,
        Attribute: r.attribute ?? '',
        'KPI Item': r.kpi_item,
        Unit: r.unit,
        Target: r.target,
        DefineBaseline: r.define_baseline,
        'KPI Normalized': r.kpi_normalized,
        'GVS Group Normalized': r.gvs_group_normalized,
        Total: r.total,
        'GVS Group': r.gvs_group,
      })),
      `${taskName || taskId}_L2P_KPI_by_Attribute.csv`,
    );
  };

  const handleDownloadOdd = () => {
    if (!data?.byODD) return;
    downloadCsv(
      data.byODD.map((r: KpiByOddRow) => ({
        ODD: r.odd,
        'KPI Item': r.kpi_item,
        Unit: r.unit,
        Target: r.target,
        Define: r.define,
        Baseline: r.baseline,
        'KPI Normalized': r.kpi_normalized,
        'GVS Group Normalized': r.gvs_group_normalized,
        Total: r.total,
        'GVS Group': r.gvs_group,
      })),
      `${taskName || taskId}_L2P_KPI_by_ODD.csv`,
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`L2P KPI Table — ${taskName || taskId || ''}`}
      width={1200}
      footer={null}
      destroyOnClose
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : !data || (data.byAttribute.length === 0 && data.byODD.length === 0) ? (
        <Empty description="No KPI data available" />
      ) : (
        <Tabs
          defaultActiveKey="attr"
          items={[
            {
              key: 'attr',
              label: 'L2P KPI (by Attribute)',
              children: (
                <div>
                  <div style={{ marginBottom: 12, textAlign: 'right' }}>
                    <Button icon={<DownloadOutlined />} size="small" onClick={handleDownloadAttr}>
                      Download CSV
                    </Button>
                  </div>
                  <Table
                    dataSource={byAttrMerged}
                    columns={attrColumns as any}
                    rowKey={(_, i) => `attr-${i}`}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 1100 }}
                  />
                </div>
              ),
            },
            {
              key: 'odd',
              label: 'L2P KPI (by ODD)',
              children: (
                <div>
                  <div style={{ marginBottom: 12, textAlign: 'right' }}>
                    <Button icon={<DownloadOutlined />} size="small" onClick={handleDownloadOdd}>
                      Download CSV
                    </Button>
                  </div>
                  <Table
                    dataSource={byOddMerged}
                    columns={oddColumns as any}
                    rowKey={(_, i) => `odd-${i}`}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 1100 }}
                  />
                </div>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
