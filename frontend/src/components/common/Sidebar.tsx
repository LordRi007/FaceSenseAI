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
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scanner', label: 'Live Face Scanner', icon: ScanFace, highlight: true },
  { path: '/analytics', label: 'Facial Mood & Feeling Analytics', icon: BarChart3 },
  { path: '/participants', label: 'Registered Participants', icon: Users },
  { path: '/history', label: 'Expression History', icon: History },
  { path: '/reports', label: 'Reports & Statistics', icon: FileSpreadsheet },
  { path: '/cameras', label: 'Camera Management', icon: Camera },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-50 dark:bg-dark-sidebar border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-colors">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Navigation
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
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
    </aside>
  );
};

