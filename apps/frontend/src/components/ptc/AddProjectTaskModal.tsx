import { useState, useEffect } from 'react';
import { Modal, AutoComplete, Button } from 'antd';
import type { PtcProject, PtcTask } from '../../api/client';
import {
  usePtcProjects,
  usePtcTasks,
  usePtcOverviewProject,
  useCreatePtcProject,
  useCreatePtcTask,
  useUpdatePtcTask,
} from '../../hooks/usePtcApi';

export interface AddProjectTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AddProjectTaskModal({
  open,
  onClose,
  onSuccess,
}: AddProjectTaskModalProps) {
  const [projectValue, setProjectValue] = useState('');
  const [taskValue, setTaskValue] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectIsExisting, setProjectIsExisting] = useState(false);
  const [taskIsExisting, setTaskIsExisting] = useState(false);

  const debouncedProjectQ = useDebouncedValue(projectValue, 300);
  const debouncedTaskQ = useDebouncedValue(taskValue, 300);

  const { data: projects = [] } = usePtcProjects(debouncedProjectQ);
  const { data: tasks = [] } = usePtcTasks(
    selectedProjectId
      ? { project_id: selectedProjectId }
      : { q: debouncedTaskQ }
  );

  const createProject = useCreatePtcProject();
  const createTask = useCreatePtcTask();
  const updateTask = useUpdatePtcTask();

  useEffect(() => {
    if (!open) {
      setProjectValue('');
      setTaskValue('');
      setSelectedProjectId(null);
      setSelectedTaskId(null);
      setProjectIsExisting(false);
      setTaskIsExisting(false);
    }
  }, [open]);

  const projectOptions = projects.map((p: PtcProject) => ({
    value: p.project_id,
    label: p.name,
  }));

  const taskOptions = tasks.map((t: PtcTask) => ({
    value: t.task_id,
    label: t.name,
    project_id: t.project_id,
  }));

  const selectedTask = tasks.find((t) => t.task_id === selectedTaskId);
  const needOldProjectName =
    taskIsExisting &&
    !!selectedTask?.project_id &&
    projectValue.trim().length > 0;
  const { data: taskProjectData } = usePtcOverviewProject(
    selectedTask?.project_id ?? '',
    needOldProjectName
  );

  const onProjectSelect = (value: string, option: { value: string; label: string }) => {
    setProjectValue(option?.label ?? value);
    setSelectedProjectId(value);
    setProjectIsExisting(!!projects.find((p) => p.project_id === value));
    setTaskValue('');
    setSelectedTaskId(null);
    setTaskIsExisting(false);
  };

  const onTaskSelect = (value: string, option: { value: string; label: string; project_id?: string }) => {
    setTaskValue(option?.label ?? value);
    setSelectedTaskId(value);
    setTaskIsExisting(!!tasks.find((t) => t.task_id === value));
  };

  const handleSave = async () => {
    const projectName = projectValue.trim();
    const taskName = taskValue.trim();
    if (!projectName || !taskName) return;

    const bothNew = !projectIsExisting && !taskIsExisting;
    const existingProjectNewTask = projectIsExisting && !taskIsExisting;
    const existingTaskNewProject = !projectIsExisting && taskIsExisting && selectedTask?.project_id;
    const bothExisting = projectIsExisting && taskIsExisting;

    if (bothExisting) {
      onSuccess?.();
      onClose();
      return;
    }

    if (bothNew) {
      try {
        const proj = await createProject.mutateAsync(projectName);
        await createTask.mutateAsync({ name: taskName, project_id: proj.project_id });
        onSuccess?.();
        onClose();
      } catch {
        // mutation handles error
      }
      return;
    }

    if (existingProjectNewTask) {
      try {
        await createTask.mutateAsync({
          name: taskName,
          project_id: selectedProjectId!,
        });
        onSuccess?.();
        onClose();
      } catch {
        // mutation handles error
      }
      return;
    }

    if (existingTaskNewProject) {
      const taskNameForConfirm = selectedTask?.name ?? taskValue;
      const oldProjectName = taskProjectData?.project?.name ?? 'unknown';
      Modal.confirm({
        title: 'Move Task',
        content: `Task '${taskNameForConfirm}' belongs to Project '${oldProjectName}'. Move to '${projectName}'?`,
        onOk: async () => {
          try {
            const proj = await createProject.mutateAsync(projectName);
            await updateTask.mutateAsync({
              id: selectedTaskId!,
              data: { project_id: proj.project_id },
            });
            onSuccess?.();
            onClose();
          } catch {
            // mutation handles error
          }
        },
      });
    }
  };

  const canSave = projectValue.trim().length > 0 && taskValue.trim().length > 0;
  const isLoading =
    createProject.isPending || createTask.isPending || updateTask.isPending;

  return (
    <Modal
      title="Add Project / Task"
      open={open}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          disabled={!canSave || isLoading}
          onClick={handleSave}
        >
          Save
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AutoComplete
          placeholder="Project"
          value={projectValue}
          onChange={(v) => {
            setProjectValue(v);
            setSelectedProjectId(null);
            setProjectIsExisting(false);
          }}
          onSelect={(v, opt) => onProjectSelect(v, opt as { value: string; label: string })}
          options={projectOptions}
          style={{ width: '100%' }}
          filterOption={() => true}
        />
        <AutoComplete
          placeholder="Task"
          value={taskValue}
          onChange={(v) => {
            setTaskValue(v);
            setSelectedTaskId(null);
            setTaskIsExisting(false);
          }}
          onSelect={(v, opt) => onTaskSelect(v, opt as { value: string; label: string; project_id?: string })}
          options={taskOptions}
          style={{ width: '100%' }}
          filterOption={() => true}
        />
      </div>
    </Modal>
  );
}
