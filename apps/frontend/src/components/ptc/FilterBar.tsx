import { useState, useEffect } from 'react';
import { Select } from 'antd';
import {
  usePtcProjects,
  usePtcTasks,
  usePtcBuilds,
  usePtcCars,
  usePtcTags,
  usePtcDrives,
} from '../../hooks/usePtcApi';

export interface FilterBarFilters {
  project_id?: string;
  task_id?: string;
  build_id?: string;
  car_id?: string;
  tag_id?: string;
  drive_id?: string;
}

interface FilterBarProps {
  filters: FilterBarFilters;
  onChange: (filters: FilterBarFilters) => void;
}

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [projectSearch, setProjectSearch] = useState('');
  const [buildSearch, setBuildSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [carSearch, setCarSearch] = useState('');
  const [driveSearch, setDriveSearch] = useState('');

  const debouncedProjectQ = useDebouncedValue(projectSearch, DEBOUNCE_MS);
  const debouncedBuildQ = useDebouncedValue(buildSearch, DEBOUNCE_MS);
  const debouncedTagQ = useDebouncedValue(tagSearch, DEBOUNCE_MS);
  const debouncedCarQ = useDebouncedValue(carSearch, DEBOUNCE_MS);
  const debouncedDriveQ = useDebouncedValue(driveSearch, DEBOUNCE_MS);

  const { data: projects = [] } = usePtcProjects(debouncedProjectQ);
  const { data: tasks = [] } = usePtcTasks({
    project_id: filters.project_id,
  });
  const { data: builds = [] } = usePtcBuilds(debouncedBuildQ);
  const { data: cars = [] } = usePtcCars({
    q: debouncedCarQ,
    build_id: filters.build_id,
    tag_id: filters.tag_id,
  });
  const { data: tags = [] } = usePtcTags(debouncedTagQ);
  const { data: drives = [] } = usePtcDrives({
    car_id: filters.car_id,
    build_id: filters.build_id,
    tag_id: filters.tag_id,
    q: debouncedDriveQ,
    limit: 50,
  });

  const filterOption = (input: string, option?: { label?: string; value?: string }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  return (
    <div className="ptc-filter-bar">
      <Select
        allowClear
        showSearch
        placeholder="Project"
        value={filters.project_id || null}
        onChange={(v) =>
          onChange({ ...filters, project_id: v ?? undefined, task_id: undefined })
        }
        onSearch={setProjectSearch}
        filterOption={filterOption}
        options={projects.map((p) => ({ value: p.project_id, label: p.name }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Task"
        value={filters.task_id || null}
        onChange={(v) => onChange({ ...filters, task_id: v ?? undefined })}
        filterOption={filterOption}
        options={tasks.map((t) => ({
          value: t.task_id,
          label: t.name,
        }))}
        disabled={!filters.project_id}
      />
      <Select
        allowClear
        showSearch
        placeholder="Build"
        value={filters.build_id || null}
        onChange={(v) => onChange({ ...filters, build_id: v ?? undefined })}
        onSearch={setBuildSearch}
        filterOption={filterOption}
        options={builds.map((b) => ({
          value: b.build_id,
          label: b.version_tag,
        }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Car"
        value={filters.car_id || null}
        onChange={(v) => onChange({ ...filters, car_id: v ?? undefined })}
        onSearch={setCarSearch}
        filterOption={filterOption}
        options={cars.map((c) => ({
          value: c.car_id,
          label: c.name || c.vin || c.car_id,
        }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Tag"
        value={filters.tag_id || null}
        onChange={(v) => onChange({ ...filters, tag_id: v ?? undefined })}
        onSearch={setTagSearch}
        filterOption={filterOption}
        options={tags.map((t) => ({ value: t.tag_id, label: t.name }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Drive"
        value={filters.drive_id || null}
        onChange={(v) => onChange({ ...filters, drive_id: v ?? undefined })}
        onSearch={setDriveSearch}
        filterOption={filterOption}
        options={drives.map((d) => ({
          value: d.drive_id,
          label: d.drive_id,
        }))}
      />
    </div>
  );
}
