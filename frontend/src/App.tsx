import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ScannerProvider } from './contexts/ScannerContext';
import { MainLayout } from './layouts/MainLayout';

import { DashboardPage } from './pages/DashboardPage';
import { LiveScannerPage } from './pages/LiveScannerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { ExpressionHistoryPage } from './pages/ExpressionHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { CameraManagementPage } from './pages/CameraManagementPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ScannerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="scanner" element={<LiveScannerPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="participants" element={<ParticipantsPage />} />
              <Route path="history" element={<ExpressionHistoryPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="cameras" element={<CameraManagementPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ScannerProvider>
    </ThemeProvider>
  );
};

export default App;

