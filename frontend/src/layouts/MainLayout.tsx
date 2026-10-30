import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { RegisterConsentModal } from '../components/scanner/RegisterConsentModal';
import { CheckInModal } from '../components/scanner/CheckInModal';

export const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <Navbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Modals for Consent Registration & Returning Check-In */}
      <RegisterConsentModal />
      <CheckInModal />
    </div>
  );
};

