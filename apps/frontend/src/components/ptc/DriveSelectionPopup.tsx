import { useState, useEffect } from 'react';
import { Drawer, Input, Checkbox, Select, Button, Tooltip } from 'antd';

const PRESETS = ['数据异常', '重复', '不相关', '设备故障', '其他'];

export interface DriveSelectionDrive {
  drive_id: string;
  selected: boolean;
  deselect_reason_preset?: string;
  deselect_reason_text?: string;
  detail?: {
    drive_id: string;
    date: string;
    mileage_km: number;
    xl_events: number;
    l_events: number;
    route?: string;
  };
}

export interface DriveSelectionPopupProps {
  open: boolean;
  onClose: () => void;
  bindingId: string;
  carId: string;
  drives: DriveSelectionDrive[];
  onSave: (updates: Array<{ drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }>) => void;
}

export default function DriveSelectionPopup({
  open,
  onClose,
  bindingId: _bindingId,
  carId: _carId,
  drives,
  onSave,
}: DriveSelectionPopupProps) {
  const [localDrives, setLocalDrives] = useState<DriveSelectionDrive[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setLocalDrives(JSON.parse(JSON.stringify(drives)));
      setSearch('');
    }
  }, [open, drives]);

  const filtered = localDrives.filter(
    (d) => !search || d.drive_id.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheck = (driveId: string, checked: boolean) => {
    setLocalDrives((prev) =>
      prev.map((d) =>
        d.drive_id === driveId
          ? {
              ...d,
              selected: checked,
              ...(checked ? {} : { deselect_reason_preset: undefined, deselect_reason_text: undefined }),
            }
          : d
      )
    );
  };

  const handleReasonPreset = (driveId: string, value: string) => {
    setLocalDrives((prev) =>
      prev.map((d) =>
        d.drive_id === driveId ? { ...d, deselect_reason_preset: value } : d
      )
    );
  };

  const handleReasonText = (driveId: string, value: string) => {
    setLocalDrives((prev) =>
      prev.map((d) =>
        d.drive_id === driveId ? { ...d, deselect_reason_text: value } : d
      )
    );
  };

  const handleSave = () => {
    const updates = localDrives.map((d) => ({
      drive_id: d.drive_id,
      selected: d.selected,
      ...(d.selected ? {} : { deselect_reason_preset: d.deselect_reason_preset, deselect_reason_text: d.deselect_reason_text }),
    }));
    onSave(updates);
    onClose();
  };

  return (
    <Drawer
      title="Drive Selection"
      width={520}
      open={open}
      onClose={onClose}
      className="ptc-drive-popup"
      zIndex={1100}
      footer={
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      }
    >
      <Input.Search
        placeholder="Filter by drive_id"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 16 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((d) => (
          <div key={d.drive_id} className="drive-item">
            <Checkbox
              checked={d.selected}
              onChange={(e) => handleCheck(d.drive_id, e.target.checked)}
            />
            <div className="drive-item-info">
              <div>{d.drive_id}</div>
              {d.detail && (
                <div className="drive-item-meta">
                  {d.detail.date} · {d.detail.mileage_km} km · XL: {d.detail.xl_events} · L: {d.detail.l_events}
                </div>
              )}
              {!d.selected && (
                <div className="deselect-reason" style={{ marginTop: 8 }}>
                  <Select
                    placeholder="Reason preset"
                    value={d.deselect_reason_preset}
                    onChange={(v) => handleReasonPreset(d.drive_id, v)}
                    options={PRESETS.map((p) => ({ label: p, value: p }))}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                  <Tooltip
                    title={
                      [d.deselect_reason_preset, d.deselect_reason_text].filter(Boolean).join(' · ') || undefined
                    }
                  >
                    <Input.TextArea
                      placeholder="Free text reason"
                      value={d.deselect_reason_text}
                      onChange={(e) => handleReasonText(d.drive_id, e.target.value)}
                      rows={2}
                    />
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
