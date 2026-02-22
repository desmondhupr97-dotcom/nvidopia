import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import RunsPage from './pages/RunsPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import KpiDashboardPage from './pages/KpiDashboardPage';
import TraceabilityPage from './pages/TraceabilityPage';
import AutoTriagePlaceholderPage from './pages/AutoTriagePlaceholderPage';
import SimulationPlaceholderPage from './pages/SimulationPlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="issues/:id" element={<IssueDetailPage />} />
        <Route path="kpi" element={<KpiDashboardPage />} />
        <Route path="traceability" element={<TraceabilityPage />} />
        <Route path="auto-triage" element={<AutoTriagePlaceholderPage />} />
        <Route path="simulation" element={<SimulationPlaceholderPage />} />
      </Route>
    </Routes>
  );
}
