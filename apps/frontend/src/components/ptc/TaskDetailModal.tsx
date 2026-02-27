import { useState } from 'react';
import { Modal, Table, Tag, Spin, Empty, Button } from 'antd';
import type { PtcBindingDrive } from '../../api/client';
import { usePtcOverviewTask, useUpdatePtcBindingDrives } from '../../hooks/usePtcApi';
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
  const updateDrives = useUpdatePtcBindingDrives();
  const [drivePopup, setDrivePopup] = useState<{
    bindingId: string;
    carId: string;
    drives: PtcBindingDrive[];
  } | null>(null);

  const task = data?.task;
  const binding = data?.binding;

  const handleDriveSave = (updates: Array<{ drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }>) => {
    if (!drivePopup) return;
    updateDrives.mutate(
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

  const tableData =
    binding?.cars?.map((car) => {
      const buildIds = [...new Set(car.drives.map((d) => d.detail?.build_id).filter(Boolean))] as string[];
      const tagIds = [...new Set(car.drives.map((d) => d.detail?.tag_id).filter(Boolean))] as string[];
      const selectedCount = car.drives.filter((d) => d.selected).length;
      const totalCount = car.drives.length;
      return {
        key: car.car_id,
        car_id: car.car_id,
        build_ids: buildIds.join(', ') || '—',
        tag_ids: tagIds.join(', ') || '—',
        driveCount: `${selectedCount} / ${totalCount}`,
        drives: car.drives,
        updated_at: binding.updated_at,
      };
    }) ?? [];

  const columns = [
    {
      title: 'Build',
      dataIndex: 'build_ids',
      key: 'build_ids',
    },
    {
      title: 'Car',
      dataIndex: 'car_id',
      key: 'car_id',
    },
    {
      title: 'Tag',
      dataIndex: 'tag_ids',
      key: 'tag_ids',
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
          editable ? (
            <Button type="primary" onClick={onClose}>
              Save
            </Button>
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
