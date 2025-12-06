import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { NotePage } from './pages/NotePage';
import { FolderPage } from './pages/FolderPage';
import { SearchPage } from './pages/SearchPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { GraphPage } from './pages/GraphPage';
import { SplitViewPage } from './pages/SplitViewPage';
import { PersonalHomePage } from './pages/PersonalHomePage';
import { PersonalNotePage } from './pages/PersonalNotePage';
import { PersonalFolderPage } from './pages/PersonalFolderPage';
import { Toaster } from './components/ui/Toaster';
import { ShortcutsPage } from './components/shortcuts/ShortcutsPage';
import { ShortcutsModalTrigger } from './components/shortcuts/ShortcutsModal';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { CalendarPage } from './components/calendar/CalendarPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="notes/:noteId" element={<NotePage />} />
          <Route path="folders/:folderId" element={<FolderPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="shortcuts" element={<ShortcutsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="split" element={<SplitViewPage />} />
          <Route path="split/:noteId" element={<SplitViewPage />} />
          <Route path="admin/*" element={<AdminPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Espace Personnel */}
          <Route path="personal" element={<PersonalHomePage />} />
          <Route path="personal/note/:noteId" element={<PersonalNotePage />} />
          <Route path="personal/folder/:folderId" element={<PersonalFolderPage />} />
          <Route path="personal/new" element={<PersonalHomePage />} />
          <Route path="personal/new-folder" element={<PersonalHomePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
      <ShortcutsModalTrigger />
    </>
  );
}
