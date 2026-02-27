import { useState } from 'react';
import { Modal, Select, Button, Table, Spin } from 'antd';
import type { PtcFilterResult } from '../../api/client';
import {
  usePtcBuilds,
  usePtcCars,
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
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const filterParams = {
    builds: selectedBuilds.length ? selectedBuilds.join(',') : undefined,
    cars: selectedCars.length ? selectedCars.join(',') : undefined,
    tags: selectedTags.length ? selectedTags.join(',') : undefined,
  };
  const hasFilter =
    selectedBuilds.length > 0 ||
    selectedCars.length > 0 ||
    selectedTags.length > 0;

  const { data: builds = [] } = usePtcBuilds();
  const { data: cars = [] } = usePtcCars({
    build_id: selectedBuilds[0],
    tag_id: selectedTags[0],
  });
  const { data: tags = [] } = usePtcTags();
  const { data: filterResults, isLoading: filterLoading } = usePtcDriveFilter(
    filterParams,
    searchTriggered && !!hasFilter
  );

  const createBinding = useCreatePtcBinding();

  const handleSearch = () => {
    if (!hasFilter) return;
    setSearchTriggered(true);
  };

  const handleSave = (status: 'Draft' | 'Published') => {
    if (!taskId) return;
    const carIds = searchTriggered && filterResults
      ? selectedRowKeys
      : selectedCars;
    const filter_criteria = {
      builds: selectedBuilds,
      cars: selectedCars,
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
      }
    );
  };

  const filterOption = (input: string, option?: { label?: string; value?: string }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  const buildOptions = builds.map((b) => ({
    value: b.build_id,
    label: b.version_tag,
  }));
  const carOptions = cars.map((c) => ({
    value: c.car_id,
    label: c.name || c.vin || c.car_id,
  }));
  const tagOptions = tags.map((t) => ({
    value: t.tag_id,
    label: t.name,
  }));

  const tableData = (filterResults ?? []).map((r: PtcFilterResult) => ({
    key: r.car_id,
    car_id: r.car_id,
    drive_count: r.drive_count,
    total_mileage: r.total_mileage,
    date_range: r.date_range
      ? `${r.date_range.start} – ${r.date_range.end}`
      : '—',
  }));

  const columns = [
    { title: 'Car ID', dataIndex: 'car_id', key: 'car_id' },
    { title: 'Drive Count', dataIndex: 'drive_count', key: 'drive_count' },
    { title: 'Total Mileage', dataIndex: 'total_mileage', key: 'total_mileage' },
    { title: 'Date Range', dataIndex: 'date_range', key: 'date_range' },
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
            placeholder="Cars"
            value={selectedCars}
            onChange={setSelectedCars}
            options={carOptions}
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
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
