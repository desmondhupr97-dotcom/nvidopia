import { useState } from 'react';
import { Modal, Select, Button, Table, Spin, message } from 'antd';
import type { PtcFilterResult, PtcFilterResultDrive } from '../../api/client';
import {
  usePtcBuilds,
  usePtcTags,
  usePtcDriveFilter,
  useCreatePtcBinding,
} from '../../hooks/usePtcApi';

export interface BindingConfigModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string | null;
  taskName?: string;
  onSuccess?: () => void;
}

export default function BindingConfigModal({
  open,
  onClose,
  taskId,
  taskName,
  onSuccess,
}: BindingConfigModalProps) {
  const [selectedBuilds, setSelectedBuilds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const filterParams = {
    builds: selectedBuilds.length ? selectedBuilds.join(',') : undefined,
    tags: selectedTags.length ? selectedTags.join(',') : undefined,
  };
  const hasFilter = selectedBuilds.length > 0 || selectedTags.length > 0;

  const { data: builds = [] } = usePtcBuilds();
  const { data: tags = [] } = usePtcTags();
  const { data: filterResults, isLoading: filterLoading } = usePtcDriveFilter(
    filterParams,
    searchTriggered && !!hasFilter
  );

  const createBinding = useCreatePtcBinding();

  const handleSearch = () => {
    if (!hasFilter) return;
    setSearchTriggered(true);
    setExpandedRowKeys([]);
  };

  const handleSave = (status: 'Draft' | 'Published') => {
    if (!taskId) return;
    const carIds = searchTriggered && filterResults ? selectedRowKeys : [];
    const filter_criteria = {
      builds: selectedBuilds,
      cars: [] as string[],
      tags: selectedTags,
    };
    createBinding.mutate(
      {
        task_id: taskId,
        filter_criteria,
        car_ids: carIds,
        status,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          const msg = (err as { message?: string })?.message;
          if (status === 409 || (msg && msg.includes('already exists'))) {
            message.warning('Binding already exists for this task. Use Edit Binding instead.');
          } else {
            message.error(msg || 'Failed to create binding');
          }
        },
      }
    );
  };

  const filterOption = (input: string, option?: { label?: string; value?: string }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  const buildOptions = builds.map((b) => ({
    value: b.build_id,
    label: b.version_tag,
  }));
  const tagOptions = tags.map((t) => ({
    value: t.tag_id,
    label: t.name,
  }));

  const tableData = (filterResults ?? []).map((r: PtcFilterResult) => ({
    key: r.car_id,
    car_id: r.car_id,
    drive_count: r.drive_count,
    hotline_count: r.hotline_count ?? 0,
    drives: r.drives ?? [],
  }));

  const columns = [
    { title: 'Car ID', dataIndex: 'car_id', key: 'car_id' },
    {
      title: 'Drives',
      dataIndex: 'drive_count',
      key: 'drive_count',
      render: (count: number, record: (typeof tableData)[0]) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            setExpandedRowKeys((prev) =>
              prev.includes(record.key)
                ? prev.filter((k) => k !== record.key)
                : [...prev, record.key]
            );
          }}
        >
          {count}
        </Button>
      ),
    },
    { title: 'Hotlines', dataIndex: 'hotline_count', key: 'hotline_count' },
  ];

  const driveColumns = [
    { title: 'Drive ID', dataIndex: 'drive_id', key: 'drive_id' },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: 'Mileage (km)',
      dataIndex: 'mileage_km',
      key: 'mileage_km',
      render: (v: number) => v?.toFixed(1) ?? '—',
    },
    {
      title: 'Start',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (v: string) => (v ? new Date(v).toLocaleTimeString() : '—'),
    },
    {
      title: 'End',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (v: string) => (v ? new Date(v).toLocaleTimeString() : '—'),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  const isSaving = createBinding.isPending;

  return (
    <Modal
      title={`Add Binding${taskName ? `: ${taskName}` : ''}`}
      open={open}
      onCancel={onClose}
      width={700}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="draft"
          onClick={() => handleSave('Draft')}
          loading={isSaving}
          disabled={!taskId}
        >
          Save as Draft
        </Button>,
        <Button
          key="publish"
          type="primary"
          onClick={() => handleSave('Published')}
          loading={isSaving}
          disabled={!taskId}
        >
          Publish
        </Button>,
      ]}
    >
      <div className="ptc-binding-config">
        <div className="filter-section">
          <Select
            mode="multiple"
            showSearch
            placeholder="Builds"
            value={selectedBuilds}
            onChange={setSelectedBuilds}
            options={buildOptions}
            filterOption={filterOption}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <Select
            mode="multiple"
            showSearch
            placeholder="Tags"
            value={selectedTags}
            onChange={setSelectedTags}
            options={tagOptions}
            filterOption={filterOption}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <Button
            type="primary"
            onClick={handleSearch}
            disabled={!hasFilter}
          >
            Search
          </Button>
        </div>
        {searchTriggered && (
          <div className="car-selection">
            {filterLoading ? (
              <Spin />
            ) : (
              <Table
                columns={columns}
                dataSource={tableData}
                rowSelection={rowSelection}
                pagination={false}
                size="small"
                expandable={{
                  expandedRowKeys,
                  onExpandedRowsChange: (keys) =>
                    setExpandedRowKeys(keys as string[]),
                  expandedRowRender: (record) => (
                    <Table
                      columns={driveColumns}
                      dataSource={(record.drives as PtcFilterResultDrive[]).map(
                        (d) => ({ ...d, key: d.drive_id })
                      )}
                      pagination={false}
                      size="small"
                    />
                  ),
                }}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
