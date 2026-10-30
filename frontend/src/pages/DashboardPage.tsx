import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsOverview, getTrends } from '../services/api';
import { AnalyticsOverview, DailyTrendItem, EMOTION_EMOJIS } from '../types';
import { useScanner } from '../contexts/ScannerContext';
import {
  Users,
  Activity,
  Smile,
  UserCheck,
  UserPlus,
  BarChart2,
  ScanFace,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ExpressionPieChart } from '../components/analytics/ExpressionPieChart';
import { DailyTrendBarChart } from '../components/analytics/DailyTrendBarChart';

export const DashboardPage: React.FC = () => {
  const { faces, isStreaming, liveFps } = useScanner();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([getAnalyticsOverview(), getTrends()])
      .then(([ov, tr]) => {
        setOverview(ov);
        setDailyTrends(tr.daily_trends);
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-indigo-950/20 to-slate-900/60 border border-indigo-500/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            FaceSense AI Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Autonomous computer-vision analytics delivering real-time facial expression tracking, consent-driven
            participant check-ins, and actionable metrics.
          </p>
        </div>

        <Link
          to="/scanner"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all shrink-0"
        >
          <ScanFace className="w-4 h-4" />
          <span>Launch Live Scanner</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Participants */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Participants</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.total_participants ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Registered records</p>
        </div>

        {/* Active Face Tracks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Tracks</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {faces.length}
          </div>
          <p className="text-[10px] text-slate-500">{isStreaming ? `${liveFps} FPS active` : 'Camera idle'}</p>
        </div>

        {/* New Registrations Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">New Today</span>
            <UserPlus className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.registrations_today ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Consented snapshots</p>
        </div>

        {/* Returning Check-Ins Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Check-Ins</span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.check_ins_today ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Authorized arrivals</p>
        </div>

        {/* Predictions Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Predictions</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.predictions_today ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Today's samples</p>
        </div>

        {/* Top Predicted Expression */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Top Feeling</span>
            <Smile className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-500 truncate flex items-center gap-1.5">
            <span>{EMOTION_EMOJIS[overview?.most_common_expression || ''] || '😐'}</span>
            <span>{overview?.most_common_expression ?? 'Neutral'}</span>
          </div>
          <p className="text-[10px] text-slate-500">{overview?.most_common_expression_percentage ?? 0}% overall</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Expression Trend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Daily Expression Trends (Last 7 Days)
            </h3>
            <span className="text-xs text-slate-400">Aggregated events</span>
          </div>
          <DailyTrendBarChart data={dailyTrends} />
        </div>

        {/* Live Camera Quick Status Widget */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Live Scanner Telemetry
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-auto">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Live Track Count</span>
              <div className="text-2xl font-bold font-mono text-indigo-500">{faces.length}</div>
              <p className="text-[10px] text-slate-500">Currently in field of view</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Frame Frequency</span>
              <div className="text-2xl font-bold font-mono text-cyan-400">{liveFps} FPS</div>
              <p className="text-[10px] text-slate-500">Camera ingestion rate</p>
            </div>
          </div>

          <Link
            to="/scanner"
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
          >
            <span>Open Fullscreen Live Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
