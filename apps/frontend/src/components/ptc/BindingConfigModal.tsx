import { useState } from 'react';
import { Modal, Select, Button, Table, Spin, message, Checkbox } from 'antd';
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
  const [driveSelection, setDriveSelection] = useState<Record<string, Record<string, boolean>>>({});

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

  const isDriveSelected = (carId: string, driveId: string) =>
    driveSelection[carId]?.[driveId] !== false;

  const toggleDrive = (carId: string, driveId: string, checked: boolean) => {
    setDriveSelection((prev) => ({
      ...prev,
      [carId]: { ...prev[carId], [driveId]: checked },
    }));
  };

  const toggleAllDrivesForCar = (carId: string, checked: boolean) => {
    const car = filterResults?.find((r) => r.car_id === carId);
    if (!car) return;
    const sel: Record<string, boolean> = {};
    for (const d of car.drives) {
      sel[d.drive_id] = checked;
    }
    setDriveSelection((prev) => ({ ...prev, [carId]: sel }));
  };

  const getSelectedDriveCount = (carId: string, drives: PtcFilterResultDrive[]) => {
    const carSel = driveSelection[carId];
    if (!carSel) return drives.length;
    return drives.filter((d) => carSel[d.drive_id] !== false).length;
  };

  const handleSearch = () => {
    if (!hasFilter) return;
    setSearchTriggered(true);
    setExpandedRowKeys([]);
    setDriveSelection({});
  };

  const handleSave = (status: 'Draft' | 'Published') => {
    if (!taskId) return;

    let cars: Array<{ car_id: string; drives: Array<{ drive_id: string; selected: boolean }> }> | undefined;

    if (searchTriggered && filterResults) {
      cars = filterResults
        .filter((r) => selectedRowKeys.includes(r.car_id))
        .map((r) => ({
          car_id: r.car_id,
          drives: r.drives.map((d) => ({
            drive_id: d.drive_id,
            selected: isDriveSelected(r.car_id, d.drive_id),
          })),
        }));
    }

    createBinding.mutate(
      {
        task_id: taskId,
        filter_criteria: {
          builds: selectedBuilds,
          cars: [] as string[],
          tags: selectedTags,
        },
        cars,
        status,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (err: unknown) => {
          const st = (err as { status?: number })?.status;
          const msg = (err as { message?: string })?.message;
          if (st === 409 || (msg && msg.includes('already exists'))) {
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
      render: (count: number, record: (typeof tableData)[0]) => {
        const selectedCount = getSelectedDriveCount(record.car_id, record.drives);
        return (
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
            {selectedCount} / {count}
          </Button>
        );
      },
    },
    { title: 'Hotlines', dataIndex: 'hotline_count', key: 'hotline_count' },
  ];

  const driveColumns = [
    {
      title: 'Drive ID',
      dataIndex: 'drive_id',
      key: 'drive_id',
    },
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
                  expandedRowRender: (record) => {
                    const carId = record.car_id;
                    const carDrives = (record.drives as PtcFilterResultDrive[]).map(
                      (d) => ({ ...d, key: d.drive_id })
                    );
                    const allSelected = carDrives.every((d) => isDriveSelected(carId, d.drive_id));
                    const someSelected = carDrives.some((d) => isDriveSelected(carId, d.drive_id));

                    const selectCol = {
                      title: (
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onChange={(e) => toggleAllDrivesForCar(carId, e.target.checked)}
                        />
                      ),
                      key: 'drive_selected',
                      width: 40,
                      render: (_: unknown, d: PtcFilterResultDrive & { key: string }) => (
                        <Checkbox
                          checked={isDriveSelected(carId, d.drive_id)}
                          onChange={(e) => toggleDrive(carId, d.drive_id, e.target.checked)}
                        />
                      ),
                    };

                    return (
                      <Table
                        columns={[selectCol, ...driveColumns]}
                        dataSource={carDrives}
                        pagination={false}
                        size="small"
                      />
                    );
                  },
                }}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
