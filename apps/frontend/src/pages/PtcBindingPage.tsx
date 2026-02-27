import { useState, useCallback } from 'react';
import { Button, Space, Modal, Select, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import FilterBar from '../components/ptc/FilterBar';
import type { FilterBarFilters } from '../components/ptc/FilterBar';
import ProjectCollapseList from '../components/ptc/ProjectCollapseList';
import TaskDetailModal from '../components/ptc/TaskDetailModal';
import AddProjectTaskModal from '../components/ptc/AddProjectTaskModal';
import BindingConfigModal from '../components/ptc/BindingConfigModal';
import {
  usePtcOverview,
  usePtcProjects,
  usePtcTasks,
  usePtcBindings,
} from '../hooks/usePtcApi';
import type { PtcOverviewProject } from '../api/client';
import '../styles/ptc.css';

export default function PtcBindingPage() {
  const [filters, setFilters] = useState<FilterBarFilters>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalEditable, setTaskModalEditable] = useState(false);
  const [addPTModalOpen, setAddPTModalOpen] = useState(false);
  const [bindingModalOpen, setBindingModalOpen] = useState(false);
  const [bindingTaskId, setBindingTaskId] = useState<string | null>(null);
  const [bindingTaskName, setBindingTaskName] = useState<string | undefined>();

  const [editSelectOpen, setEditSelectOpen] = useState(false);
  const [selectedEditProject, setSelectedEditProject] = useState<string | undefined>();
  const [selectedEditTask, setSelectedEditTask] = useState<string | undefined>();

  const { data: overview, isLoading } = usePtcOverview();
  const { data: allProjects } = usePtcProjects();
  const { data: editTasks } = usePtcTasks(selectedEditProject ? { project_id: selectedEditProject } : undefined);
  const { data: existingBindings } = usePtcBindings(
    selectedEditTask ? { task_id: selectedEditTask } : undefined
  );

  const projects: PtcOverviewProject[] = Array.isArray(overview) ? overview : [];

  const filteredProjects = projects.filter((p) => {
    if (filters.project_id && p.project_id !== filters.project_id) return false;
    return true;
  });

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskModalEditable(false);
    setTaskModalOpen(true);
  }, []);

  const handleAddEditBinding = useCallback(() => {
    setEditSelectOpen(true);
    setSelectedEditProject(undefined);
    setSelectedEditTask(undefined);
  }, []);

  const confirmEditSelect = useCallback(() => {
    if (!selectedEditTask) return;
    const hasBinding = existingBindings && existingBindings.length > 0;
    if (hasBinding) {
      setSelectedTaskId(selectedEditTask);
      setTaskModalEditable(true);
      setTaskModalOpen(true);
    } else {
      setBindingTaskId(selectedEditTask);
      const task = editTasks?.find((t) => t.task_id === selectedEditTask);
      setBindingTaskName(task?.name);
      setBindingModalOpen(true);
    }
    setEditSelectOpen(false);
  }, [selectedEditTask, editTasks, existingBindings]);

  return (
    <div className="ptc-page">
      <h2>PTC Binding</h2>

      <FilterBar filters={filters} onChange={setFilters} />

      <Space className="ptc-actions" wrap>
        <Button icon={<PlusOutlined />} onClick={() => setAddPTModalOpen(true)}>
          Add Project / Task
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAddEditBinding}>
          Add / Edit Binding
        </Button>
      </Space>

      {isLoading ? (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 60 }} />
      ) : (
        <ProjectCollapseList
          projects={filteredProjects}
          onTaskClick={handleTaskClick}
          filters={filters as Record<string, string | undefined>}
        />
      )}

      <TaskDetailModal
        taskId={selectedTaskId}
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        editable={taskModalEditable}
      />

      <AddProjectTaskModal
        open={addPTModalOpen}
        onClose={() => setAddPTModalOpen(false)}
      />

      <BindingConfigModal
        open={bindingModalOpen}
        onClose={() => setBindingModalOpen(false)}
        taskId={bindingTaskId}
        taskName={bindingTaskName}
      />

      <Modal
        title="Select Project / Task"
        open={editSelectOpen}
        onCancel={() => setEditSelectOpen(false)}
        okText="Continue"
        onOk={confirmEditSelect}
        okButtonProps={{ disabled: !selectedEditTask }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Select
            style={{ width: '100%' }}
            placeholder="Select Project"
            showSearch
            allowClear
            value={selectedEditProject}
            onChange={(v) => { setSelectedEditProject(v); setSelectedEditTask(undefined); }}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={allProjects?.map((p) => ({ value: p.project_id, label: p.name }))}
          />
          <Select
            style={{ width: '100%' }}
            placeholder="Select Task"
            showSearch
            allowClear
            value={selectedEditTask}
            onChange={setSelectedEditTask}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={editTasks?.map((t) => ({ value: t.task_id, label: t.name }))}
            disabled={!selectedEditProject}
          />
        </Space>
      </Modal>
    </div>
  );
}
