import { useMemo } from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface GroupRow {
  group: Record<string, unknown>;
  value: number;
}

interface Props {
  groups: GroupRow[];
  title?: string;
}

export default function KpiTableRenderer({ groups, title }: Props) {
  const columns = useMemo<ColumnsType<GroupRow & { _key: string }>>(() => {
    const groupKeys = new Set<string>();
    groups.forEach((row) => Object.keys(row.group).forEach((k) => groupKeys.add(k)));

    const groupCols: ColumnsType<GroupRow & { _key: string }> = [...groupKeys].map((k) => ({
      title: <span style={{ fontFamily: "var(--font-mono)" }}>{k}</span>,
      dataIndex: ['group', k],
      key: k,
      render: (v: unknown) => String(v ?? '\u2014'),
    }));

    return [
      ...groupCols,
      {
        title: <span style={{ fontFamily: "var(--font-mono)" }}>Value</span>,
        dataIndex: 'value',
        key: '_value',
        align: 'right' as const,
        render: (v: number) => (
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: 'var(--accent-strong)' }}>
            {v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        ),
      },
    ];
  }, [groups]);

  const dataSource = useMemo(
    () => groups.map((row, i) => ({ ...row, _key: String(i) })),
    [groups],
  );

  return (
    <Card
      className="ios-card"
      title={
        title ? (
          <span className="font-display" style={{ fontWeight: 600 }}>{title}</span>
        ) : undefined
      }
    >
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey="_key"
        pagination={groups.length > 20 ? { pageSize: 20, size: 'small' } : false}
        size="small"
      />
    </Card>
  );
}
