import { useState } from 'react';
import { Modal, Table, Tag, Spin, Empty, Button, Space, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { PtcBindingDrive } from '../../api/client';
import {
  usePtcOverviewTask,
  useUpdatePtcBindingDrives,
  usePtcBuilds,
  usePtcTags,
  useUpdatePtcBinding,
  useDeletePtcBinding,
} from '../../hooks/usePtcApi';
import DriveSelectionPopup from './DriveSelectionPopup';

export interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  editable?: boolean;
}

export default function TaskDetailModal({
  taskId,
  open,
  onClose,
  editable = false,
}: TaskDetailModalProps) {
  const { data, isLoading } = usePtcOverviewTask(taskId ?? '', open && !!taskId);
  const updateDrivesMutation = useUpdatePtcBindingDrives();
  const updateBindingMutation = useUpdatePtcBinding();
  const deleteBindingMutation = useDeletePtcBinding();
  const { data: allBuilds = [] } = usePtcBuilds();
  const { data: allTags = [] } = usePtcTags();
  const [drivePopup, setDrivePopup] = useState<{
    bindingId: string;
    carId: string;
    drives: PtcBindingDrive[];
  } | null>(null);

  const task = data?.task;
  const binding = data?.binding;

  const buildNameMap = new Map(allBuilds.map((b) => [b.build_id, b.version_tag]));
  const tagNameMap = new Map(allTags.map((t) => [t.tag_id, t.name]));

  const handleDriveSave = (updates: Array<{ drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }>) => {
    if (!drivePopup) return;
    updateDrivesMutation.mutate(
      {
        id: drivePopup.bindingId,
        data: { car_id: drivePopup.carId, drive_updates: updates },
      },
      {
        onSuccess: () => {
          setDrivePopup(null);
        },
      }
    );
  };

  const handleRemoveCar = (carId: string) => {
    if (!binding) return;
    const updatedCars = binding.cars.filter((c) => c.car_id !== carId);
    updateBindingMutation.mutate(
      { id: binding.binding_id, data: { cars: updatedCars } },
      { onSuccess: () => message.success(`Car ${carId} removed`) }
    );
  };

  const handleDeleteBinding = () => {
    if (!binding) return;
    deleteBindingMutation.mutate(binding.binding_id, {
      onSuccess: () => {
        message.success('Binding deleted');
        onClose();
      },
      onError: () => message.error('Failed to delete binding'),
    });
  };

  const tableData =
    binding?.cars?.map((car) => {
      const buildIds = [...new Set(car.drives.map((d) => d.detail?.build_id).filter(Boolean))] as string[];
      const tagIds = [...new Set(car.drives.map((d) => d.detail?.tag_id).filter(Boolean))] as string[];
      const selectedCount = car.drives.filter((d) => d.selected).length;
      const totalCount = car.drives.length;
      return {
        key: car.car_id,
        car_id: car.car_id,
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
            binding &&
            setDrivePopup({
              bindingId: binding.binding_id,
              carId: record.car_id,
              drives: record.drives,
            })
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
      ? [
          {
            title: '',
            key: 'actions',
            width: 60,
            render: (_: unknown, record: { car_id: string }) => (
              <Popconfirm
                title={`Remove car ${record.car_id}?`}
                onConfirm={() => handleRemoveCar(record.car_id)}
                okText="Remove"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  const statusTag =
    binding?.status === 'Draft' ? (
      <Tag color="gold">Draft</Tag>
    ) : binding?.status === 'Published' ? (
      <Tag color="green">Published</Tag>
    ) : null;

  return (
    <>
      <Modal
        wrapClassName="ptc-task-modal"
        width={900}
        destroyOnClose
        open={open}
        onCancel={onClose}
        title={
          <span>
            {task?.name ?? 'Task'} {statusTag}
          </span>
        }
        footer={
          editable && binding ? (
            <Space>
              <Popconfirm
                title="Delete this binding permanently?"
                onConfirm={handleDeleteBinding}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button danger loading={deleteBindingMutation.isPending}>
                  Delete Binding
                </Button>
              </Popconfirm>
              <Button type="primary" onClick={onClose}>
                Done
              </Button>
            </Space>
          ) : null
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : !binding ? (
          <Empty description="No binding" />
        ) : (
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="small"
          />
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
