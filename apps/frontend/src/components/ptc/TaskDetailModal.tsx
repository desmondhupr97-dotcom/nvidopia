import { useState, useMemo } from 'react';
import { Modal, Table, Tag, Spin, Empty, Button, Space, Popconfirm, message, Select } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { PtcBindingDrive } from '../../api/client';
import {
  usePtcOverviewTask,
  useUpdatePtcBindingDrives,
  useUpdatePtcBinding,
  useDeletePtcBinding,
  usePtcDriveFilter,
  usePtcMetaOptions,
} from '../../hooks/usePtcApi';
import DriveSelectionPopup from './DriveSelectionPopup';

export interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  editable?: boolean;
  onAddBinding?: (taskId: string) => void;
}

const CAR_COLORS: string[] = [
  '#76B900', '#007AFF', '#FF9500', '#AF52DE', '#FF3B30',
  '#5AC8FA', '#34C759', '#FF2D55', '#FFCC00', '#8E8E93',
];

export default function TaskDetailModal({
  taskId,
  open,
  onClose,
  editable: initialEditable = false,
  onAddBinding,
}: TaskDetailModalProps) {
  const { data, isLoading } = usePtcOverviewTask(taskId ?? '', open && !!taskId);
  const updateDrivesMutation = useUpdatePtcBindingDrives();
  const updateBindingMutation = useUpdatePtcBinding();
  const deleteBindingMutation = useDeletePtcBinding();
  const [drivePopup, setDrivePopup] = useState<{
    bindingId: string;
    carId: string;
    drives: PtcBindingDrive[];
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editBuilds, setEditBuilds] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCars, setEditCars] = useState<string[]>([]);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedNewCars, setSelectedNewCars] = useState<string[]>([]);

  const metaParams = useMemo(() => ({
    builds: editBuilds.length ? editBuilds.join(',') : undefined,
    tags: editTags.length ? editTags.join(',') : undefined,
    cars: editCars.length ? editCars.join(',') : undefined,
  }), [editBuilds, editTags, editCars]);
  const { data: metaOptions } = usePtcMetaOptions(metaParams);

  const filterParams = {
    builds: editBuilds.length ? editBuilds.join(',') : undefined,
    tags: editTags.length ? editTags.join(',') : undefined,
    cars: editCars.length ? editCars.join(',') : undefined,
  };
  const hasEditFilter = editBuilds.length > 0 || editTags.length > 0 || editCars.length > 0;
  const { data: filterResults } = usePtcDriveFilter(
    filterParams,
    searchTriggered && hasEditFilter
  );

  const task = data?.task;
  const binding = data?.binding;
  const editable = initialEditable || isEditing;

  const buildNameMap = useMemo(() => {
    if (!metaOptions?.builds) return new Map<string, string>();
    return new Map(metaOptions.builds.map((b) => [b.build_id, b.version_tag]));
  }, [metaOptions?.builds]);

  const tagNameMap = useMemo(() => {
    if (!metaOptions?.tags) return new Map<string, string>();
    return new Map(metaOptions.tags.map((t) => [t.tag_id, t.name]));
  }, [metaOptions?.tags]);

  const handleStartEdit = () => {
    if (binding) {
      setEditBuilds(binding.filter_criteria?.builds ?? []);
      setEditTags(binding.filter_criteria?.tags ?? []);
      setEditCars(binding.filter_criteria?.cars ?? []);
    }
    setSearchTriggered(false);
    setSelectedNewCars([]);
    setIsEditing(true);
  };

  const handleAddCars = () => {
    if (!binding || selectedNewCars.length === 0) return;
    const existingCarIds = new Set(binding.cars.map((c) => c.car_id));
    const filterDriveMap = new Map(
      (filterResults ?? []).map((r) => [r.car_id, new Set(r.drives.map((d) => d.drive_id))])
    );

    const updatedExisting = binding.cars.map((car) => {
      if (!selectedNewCars.includes(car.car_id)) return car;
      const validIds = filterDriveMap.get(car.car_id);
      if (!validIds) return car;
      const existingDriveIds = new Set(car.drives.map((d) => d.drive_id));
      const kept = car.drives.filter((d) => validIds.has(d.drive_id));
      const added = [...validIds]
        .filter((id) => !existingDriveIds.has(id))
        .map((drive_id) => ({ drive_id, selected: true }));
      return { ...car, drives: [...kept, ...added] as PtcBindingDrive[] };
    });

    const newCars = selectedNewCars
      .filter((id) => !existingCarIds.has(id))
      .map((car_id) => {
        const result = filterResults?.find((r) => r.car_id === car_id);
        const drives = (result?.drives ?? []).map((d) => ({
          drive_id: d.drive_id,
          selected: true,
        })) as PtcBindingDrive[];
        return { car_id, drives };
      });

    const mergedCars = [...updatedExisting, ...newCars];
    updateBindingMutation.mutate(
      {
        id: binding.binding_id,
        data: {
          cars: mergedCars,
          filter_criteria: { builds: editBuilds, cars: editCars, tags: editTags },
        },
      },
      {
        onSuccess: () => {
          const addedCount = newCars.length;
          const updatedCount = selectedNewCars.filter((id) => existingCarIds.has(id)).length;
          const parts = [];
          if (addedCount) parts.push(`${addedCount} car(s) added`);
          if (updatedCount) parts.push(`${updatedCount} car(s) updated`);
          message.success(parts.join(', ') || 'Cars updated');
          setSelectedNewCars([]);
        },
      }
    );
  };

  const handleDriveSave = (updates: Array<{ drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }>) => {
    if (!drivePopup) return;
    updateDrivesMutation.mutate(
      { id: drivePopup.bindingId, data: { car_id: drivePopup.carId, drive_updates: updates } },
      { onSuccess: () => setDrivePopup(null) }
    );
  };

  const handleRemoveCar = (carId: string) => {
    if (!binding) return;
    updateBindingMutation.mutate(
      { id: binding.binding_id, data: { cars: binding.cars.filter((c) => c.car_id !== carId) } },
      { onSuccess: () => message.success(`Car ${carId} removed`) }
    );
  };

  const handleDeleteBinding = () => {
    if (!binding) return;
    deleteBindingMutation.mutate(binding.binding_id, {
      onSuccess: () => { message.success('Binding deleted'); onClose(); },
      onError: () => message.error('Failed to delete binding'),
    });
  };

  const handleSaveBinding = () => {
    if (!binding) return;
    updateBindingMutation.mutate(
      {
        id: binding.binding_id,
        data: {
          filter_criteria: { builds: editBuilds, cars: editCars, tags: editTags },
        },
      },
      {
        onSuccess: () => {
          message.success('Binding saved');
        },
        onError: (err: unknown) => {
          message.error((err as { message?: string })?.message || 'Failed to save binding');
        },
      }
    );
  };

  const handlePublish = () => {
    if (!binding) return;
    updateBindingMutation.mutate(
      {
        id: binding.binding_id,
        data: {
          status: 'Published',
          filter_criteria: { builds: editBuilds, cars: editCars, tags: editTags },
        },
      },
      {
        onSuccess: () => {
          message.success('Binding published');
          setIsEditing(false);
        },
        onError: (err: unknown) => {
          const details = (err as { details?: string[] })?.details;
          const msg = (err as { message?: string })?.message;
          if (details?.length) {
            message.error(`Publish failed: ${details.join('; ')}`);
          } else {
            message.error(msg || 'Failed to publish binding');
          }
        },
      }
    );
  };

  const timelineData = useMemo(() => {
    if (!binding?.cars) return [];
    const rows: Array<{ car_id: string; drive_id: string; start: number; end: number; color: string }> = [];
    binding.cars.forEach((car, ci) => {
      const color = CAR_COLORS[ci % CAR_COLORS.length] ?? '#8E8E93';
      car.drives.forEach((d) => {
        if (!d.selected || !d.detail) return;
        const st = d.detail.start_time ? new Date(d.detail.start_time).getTime() : 0;
        const et = d.detail.end_time ? new Date(d.detail.end_time).getTime() : 0;
        if (st && et) {
          rows.push({ car_id: car.car_id, drive_id: d.drive_id, start: st, end: et, color });
        }
      });
    });
    return rows;
  }, [binding]);

  const ganttData = useMemo(() => {
    if (timelineData.length === 0) return { bars: [], minTime: 0, maxTime: 0, carIds: [] };
    const minTime = Math.min(...timelineData.map((r) => r.start));
    const maxTime = Math.max(...timelineData.map((r) => r.end));
    const carIds = [...new Set(timelineData.map((r) => r.car_id))];
    return {
      bars: timelineData.map((r) => ({
        ...r,
        startPct: ((r.start - minTime) / (maxTime - minTime)) * 100,
        widthPct: Math.max(0.5, ((r.end - r.start) / (maxTime - minTime)) * 100),
      })),
      minTime,
      maxTime,
      carIds,
    };
  }, [timelineData]);

  const tableData =
    binding?.cars?.map((car, ci) => {
      const buildIds = [...new Set(car.drives.map((d) => d.detail?.build_id).filter(Boolean))] as string[];
      const tagIds = [...new Set(car.drives.map((d) => d.detail?.tag_id).filter(Boolean))] as string[];
      const selectedCount = car.drives.filter((d) => d.selected).length;
      const totalCount = car.drives.length;
      return {
        key: car.car_id,
        car_id: car.car_id,
        color: CAR_COLORS[ci % CAR_COLORS.length],
        build_names: buildIds.map((id) => buildNameMap.get(id) || id).join(', ') || '—',
        tag_names: tagIds.map((id) => tagNameMap.get(id) || id).join(', ') || '—',
        driveCount: `${selectedCount} / ${totalCount}`,
        drives: car.drives,
        updated_at: binding.updated_at,
      };
    }) ?? [];

  const columns = [
    {
      title: 'Build',
      dataIndex: 'build_names',
      key: 'build_names',
    },
    {
      title: 'Car',
      dataIndex: 'car_id',
      key: 'car_id',
      render: (v: string, record: (typeof tableData)[0]) => (
        <Space size={4}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: record.color }} />
          {v}
        </Space>
      ),
    },
    {
      title: 'Tag',
      dataIndex: 'tag_names',
      key: 'tag_names',
    },
    {
      title: 'Drive',
      dataIndex: 'driveCount',
      key: 'drive',
      render: (_: unknown, record: (typeof tableData)[0]) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() =>
            binding && setDrivePopup({ bindingId: binding.binding_id, carId: record.car_id, drives: record.drives })
          }
        >
          {record.driveCount}
        </Button>
      ),
    },
    {
      title: 'Edit time',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (v: string) => (v ? new Date(v).toLocaleString() : '—'),
    },
    ...(editable
      ? [{
          title: '',
          key: 'actions',
          width: 60,
          render: (_: unknown, record: { car_id: string }) => (
            <Popconfirm title={`Remove car ${record.car_id}?`} onConfirm={() => handleRemoveCar(record.car_id)} okText="Remove" okButtonProps={{ danger: true }}>
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          ),
        }]
      : []),
  ];

  const statusTag =
    binding?.status === 'Draft' ? <Tag color="gold">Draft</Tag>
    : binding?.status === 'Published' ? <Tag color="green">Published</Tag>
    : null;

  const formatTime = (ts: number) => new Date(ts).toLocaleDateString();

  const filterOption = (input: string, option?: { label?: unknown }) =>
    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  const isDraft = binding?.status === 'Draft';

  const buildOptions = (metaOptions?.builds ?? []).map((b) => ({ value: b.build_id, label: b.version_tag }));
  const tagOptions = (metaOptions?.tags ?? []).map((t) => ({ value: t.tag_id, label: t.name }));
  const carOptions = (metaOptions?.cars ?? []).map((c) => ({ value: c.car_id, label: `${c.car_id} (${c.name})` }));

  return (
    <>
      <Modal
        wrapClassName="ptc-task-modal"
        width={960}
        destroyOnClose
        open={open}
        onCancel={() => { setIsEditing(false); onClose(); }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{task?.name ?? 'Task'}</span>
            {statusTag}
          </div>
        }
        footer={
          editable && binding ? (
            <Space>
              <Popconfirm title="Delete this binding permanently?" onConfirm={handleDeleteBinding} okText="Delete" okButtonProps={{ danger: true }}>
                <Button danger loading={deleteBindingMutation.isPending}>Delete Binding</Button>
              </Popconfirm>
              <Button onClick={handleSaveBinding} loading={updateBindingMutation.isPending}>
                {isDraft ? 'Save Draft' : 'Save'}
              </Button>
              {isDraft && (
                <Popconfirm title="Publish this binding? Build and filter validation will be performed." onConfirm={handlePublish} okText="Publish">
                  <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} loading={updateBindingMutation.isPending}>
                    Publish
                  </Button>
                </Popconfirm>
              )}
              <Button onClick={() => { setIsEditing(false); onClose(); }}>Done</Button>
            </Space>
          ) : null
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : !binding ? (
          <Empty description="No binding">
            {onAddBinding && taskId && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => onAddBinding(taskId)}>
                Add Binding
              </Button>
            )}
          </Empty>
        ) : (
          <div>
            {!editable && (
              <div style={{ textAlign: 'right', marginBottom: 12 }}>
                <Button icon={<EditOutlined />} onClick={handleStartEdit}>Edit</Button>
              </div>
            )}

            {ganttData.carIds.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Drive Timeline
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  <span>{formatTime(ganttData.minTime)}</span>
                  <span>{formatTime(ganttData.maxTime)}</span>
                </div>
                <div style={{ position: 'relative', background: 'rgba(0,0,0,0.04)', borderRadius: 6, overflow: 'hidden' }}>
                  {ganttData.carIds.map((carId) => {
                    const bars = ganttData.bars.filter((b) => b.car_id === carId);
                    return (
                      <div key={carId} style={{ position: 'relative', height: 18, marginBottom: 2 }} title={`Car ${carId}`}>
                        {bars.map((b) => (
                          <div
                            key={b.drive_id}
                            style={{
                              position: 'absolute',
                              left: `${b.startPct}%`,
                              width: `${b.widthPct}%`,
                              height: 14,
                              top: 2,
                              borderRadius: 3,
                              background: b.color,
                              opacity: 0.75,
                            }}
                            title={`${b.drive_id}: ${new Date(b.start).toLocaleString()} – ${new Date(b.end).toLocaleString()}`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  {ganttData.carIds.map((carId, idx) => (
                    <span key={carId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: CAR_COLORS[idx % CAR_COLORS.length] }} />
                      {carId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {editable && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-deep)', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add Cars by Filter</div>
                <Select
                  mode={isDraft ? 'tags' : 'multiple'}
                  showSearch
                  placeholder="Builds"
                  value={editBuilds}
                  onChange={setEditBuilds}
                  options={buildOptions}
                  filterOption={filterOption}
                  style={{ width: '100%', marginBottom: 8 }}
                />
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="Tags"
                  value={editTags}
                  onChange={setEditTags}
                  options={tagOptions}
                  filterOption={filterOption}
                  style={{ width: '100%', marginBottom: 8 }}
                />
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="Cars"
                  value={editCars}
                  onChange={setEditCars}
                  options={carOptions}
                  filterOption={filterOption}
                  style={{ width: '100%', marginBottom: 8 }}
                />
                <Space>
                  <Button type="primary" size="small" disabled={!hasEditFilter} onClick={() => { setSearchTriggered(true); setSelectedNewCars([]); }}>
                    Search
                  </Button>
                </Space>
                {searchTriggered && filterResults && (
                  <div style={{ marginTop: 8 }}>
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Select cars to add"
                      value={selectedNewCars}
                      onChange={setSelectedNewCars}
                      options={filterResults.map((r) => ({ value: r.car_id, label: `${r.car_id} (${r.drive_count} drives)` }))}
                      filterOption={filterOption}
                      style={{ width: '100%', marginBottom: 8 }}
                    />
                    <Button size="small" type="primary" disabled={selectedNewCars.length === 0} onClick={handleAddCars}>
                      Add {selectedNewCars.length} Car(s)
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>
      <DriveSelectionPopup
        open={!!drivePopup}
        onClose={() => setDrivePopup(null)}
        bindingId={drivePopup?.bindingId ?? ''}
        carId={drivePopup?.carId ?? ''}
        drives={drivePopup?.drives ?? []}
        onSave={handleDriveSave}
      />
    </>
  );
}
