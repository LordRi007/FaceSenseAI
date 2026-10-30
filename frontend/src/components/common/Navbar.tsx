import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScanner } from '../../contexts/ScannerContext';
import {
  Sun,
  Moon,
  Camera,
  Activity,
  Wifi,
  WifiOff,
  ShieldAlert,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isStreaming, isWsConnected, liveFps, activeTracksCount } = useScanner();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-800 dark:from-white dark:via-slate-200 dark:to-indigo-300 bg-clip-text text-transparent">
              FaceSense AI
            </h1>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Real-Time Facial Mood & Feeling Analytics System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time Status Badges */}
        <div className="hidden md:flex items-center gap-2">
          {/* WebSocket Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isWsConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {isWsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isWsConnected ? 'AI Engine Online' : 'Connecting'}</span>
          </div>

          {/* Camera Stream Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isStreaming
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-cyan-400 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isStreaming ? `Live: ${liveFps} FPS` : 'Camera Idle'}</span>
          </div>

          {/* Active Tracks */}
          {activeTracksCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Activity className="w-3.5 h-3.5" />
              <span>{activeTracksCount} {activeTracksCount === 1 ? 'Face Tracked' : 'Faces Tracked'}</span>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};

