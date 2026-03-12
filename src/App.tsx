import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import ConfirmDialog from './components/ConfirmDialog';
import CommandPalette from './components/CommandPalette';
import Dashboard from './pages/Dashboard';
import QuotesPage from './pages/QuotesPage';
import ClientsPage from './pages/ClientsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProjectWizard from './pages/ProjectWizard';
import AdminCatalog from './pages/AdminCatalog';
import AdminSettings from './pages/AdminSettings';
import AnalyticsPage from './pages/AnalyticsPage';
import QuoteView from './pages/QuoteView';
import AiAssistantPage from './pages/AiAssistantPage';
import WorkspacePage from './modules/workspace/WorkspacePage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <ConfirmDialog />
      <CommandPalette />
      <Routes>
        {/* All routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="project/new" element={<ProjectWizard />} />
          <Route path="project/:id" element={<ProjectWizard />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/catalog" element={<AdminCatalog />} />
          <Route path="admin/settings" element={<AdminSettings />} />
          <Route path="admin/analytics" element={<AnalyticsPage />} />
        </Route>

        {/* Standalone Quote View */}
        <Route path="/quote/:id" element={<QuoteView />} />
      </Routes>
    </BrowserRouter>
  );
}
