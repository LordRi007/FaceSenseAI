import React, { useState, useEffect } from 'react';
import {
  getAnalyticsOverview,
  getExpressionDistribution,
  getTrends,
  getParticipantAnalytics,
  getSessionTimeline,
} from '../services/api';
import {
  AnalyticsOverview,
  ExpressionDistributionItem,
  DailyTrendItem,
  WeeklyTrendItem,
  ParticipantCohortItem,
  ConfidenceBucket,
  SessionTimelineItem,
  EMOTION_EMOJIS,
} from '../types';
import { useScanner } from '../contexts/ScannerContext';
import { ExpressionPieChart } from '../components/analytics/ExpressionPieChart';
import { DailyTrendBarChart } from '../components/analytics/DailyTrendBarChart';
import { WeeklyAreaChart } from '../components/analytics/WeeklyAreaChart';
import { CohortChart } from '../components/analytics/CohortChart';
import { ConfidenceDistributionChart } from '../components/analytics/ConfidenceDistributionChart';
import {
  BarChart3,
  Users,
  Activity,
  Smile,
  Clock,
  Sparkles,
  Camera,
  RefreshCw,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { faces } = useScanner();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [expressions, setExpressions] = useState<ExpressionDistributionItem[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrendItem[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrendItem[]>([]);
  const [cohorts, setCohorts] = useState<ParticipantCohortItem[]>([]);
  const [confidenceBuckets, setConfidenceBuckets] = useState<ConfidenceBucket[]>([]);
  const [sessions, setSessions] = useState<SessionTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      getAnalyticsOverview(),
      getExpressionDistribution(),
      getTrends(),
      getParticipantAnalytics(),
      getSessionTimeline(),
    ])
      .then(([ov, expr, tr, part, sess]) => {
        setOverview(ov);
        setExpressions(expr);
        setDailyTrends(tr.daily_trends);
        setWeeklyTrends(tr.weekly_trends);
        setCohorts(part.cohorts);
        setConfidenceBuckets(part.confidence_distribution);
        setSessions(sess);
      })
      .catch((err) => console.error('Analytics load error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            <span>Facial Mood & Feeling Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Aggregated facial expression distributions, cohorts, and temporal confidence indicators.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* 6 Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Registered */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Participants</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.total_participants ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Consented registry</p>
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
          <p className="text-[10px] text-slate-500">Current session</p>
        </div>

        {/* New Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">New Today</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.registrations_today ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Registrations</p>
        </div>

        {/* Returning Check-Ins */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Check-Ins</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.check_ins_today ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Returning today</p>
        </div>

        {/* Expression Predictions Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Predictions</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overview?.predictions_today ?? 0}
          </div>
          <p className="text-[10px] text-slate-500">Evaluated frames</p>
        </div>

        {/* Most Common Predicted Expression */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Top Feeling</span>
            <Smile className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-500 truncate flex items-center gap-1.5">
            <span>{EMOTION_EMOJIS[overview?.most_common_expression || ''] || '😐'}</span>
            <span>{overview?.most_common_expression ?? 'Neutral'}</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {overview?.most_common_expression_percentage ?? 0}% overall
          </p>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Expression Distribution Pie */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Expression Distribution (All Time)
            </h3>
            <span className="text-xs text-slate-400">7 Facial Categories</span>
          </div>
          <ExpressionPieChart data={expressions} />
        </div>

        {/* 2. Daily Expression Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Daily Expression Analysis
            </h3>
            <span className="text-xs text-slate-400">Last 7 Days</span>
          </div>
          <DailyTrendBarChart data={dailyTrends} />
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Weekly Trend Line Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Weekly Expression Activity
          </h3>
          <WeeklyAreaChart data={weeklyTrends} />
        </div>

        {/* 4. New vs. Returning Cohort */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            New vs. Returning Check-Ins
          </h3>
          <CohortChart data={cohorts} />
        </div>

        {/* 5. Expression Confidence Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Model Confidence Distribution
          </h3>
          <ConfidenceDistributionChart data={confidenceBuckets} />
        </div>
      </div>

      {/* 6. Camera Session Activity Timeline */}
      <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Camera Session Activity Timeline
            </h3>
          </div>
          <span className="text-xs text-slate-400">Recent Scanning Sessions</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No session history yet.</div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess.session_id}
                className="p-3.5 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      sess.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Session #{sess.session_id} • {sess.camera_label}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Started: {new Date(sess.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-indigo-500 font-medium">
                    {sess.total_events} events
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sess.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {sess.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
