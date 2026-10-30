import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { RegisterConsentModal } from '../components/scanner/RegisterConsentModal';
import { CheckInModal } from '../components/scanner/CheckInModal';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Modals for Consent Registration & Returning Check-In */}
      <RegisterConsentModal />
      <CheckInModal />
    </div>
  );
};

