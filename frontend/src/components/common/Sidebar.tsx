import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanFace,
  BarChart3,
  Users,
  History,
  FileSpreadsheet,
  Camera,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scanner', label: 'Live Face Scanner', icon: ScanFace, highlight: true },
  { path: '/analytics', label: 'Facial Mood & Feeling Analytics', icon: BarChart3 },
  { path: '/participants', label: 'Registered Participants', icon: Users },
  { path: '/history', label: 'Expression History', icon: History },
  { path: '/reports', label: 'Reports & Statistics', icon: FileSpreadsheet },
  { path: '/cameras', label: 'Camera Management', icon: Camera },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const content = (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  } ${item.highlight && !isActive ? 'border border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : ''}`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Ethical & Privacy Notice Card */}
      <div className="p-4 m-3 rounded-2xl bg-indigo-950/20 dark:bg-slate-900/60 border border-indigo-500/10 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Ethics & Privacy</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          Consent-driven records only. Facial estimates do not determine internal psychological states.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-50 dark:bg-dark-sidebar border-r border-slate-200 dark:border-slate-800 flex-col justify-between shrink-0 transition-colors">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-out */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white dark:bg-dark-sidebar border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};

