import React, { useState, useEffect } from 'react';
import { getAnalyticsOverview, getExpressionDistribution } from '../services/api';
import { AnalyticsOverview, ExpressionDistributionItem, EMOTION_EMOJIS } from '../types';
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  FileText,
  Printer,
  Sparkles,
  BarChart,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [expressions, setExpressions] = useState<ExpressionDistributionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([getAnalyticsOverview(), getExpressionDistribution()])
      .then(([ov, expr]) => {
        setOverview(ov);
        setExpressions(expr);
      })
      .catch((err) => console.error('Reports load error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const downloadCSVReport = () => {
    let csv = 'Expression,Count,Percentage\n';
    expressions.forEach((e) => {
      csv += `${e.label},${e.count},${e.percentage}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FaceSense_AI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
            <span>Reports & Statistics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consolidated analytics summaries and exportable reports for session auditing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSVReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Executive Summary</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This system report summarizes real-time facial expression detections captured across camera sessions.
          To date, <strong>{overview?.total_participants ?? 0} participants</strong> have provided explicit
          registration consent. Today, <strong>{overview?.predictions_today ?? 0} expression estimates</strong> were
          analyzed, with <strong>{overview?.most_common_expression ?? 'Neutral'}</strong> ({overview?.most_common_expression_percentage ?? 0}%)
          representing the most prevalent estimated facial category.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Total Participants</span>
            <div className="text-xl font-bold font-mono text-indigo-500 mt-0.5">
              {overview?.total_participants ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Registrations Today</span>
            <div className="text-xl font-bold font-mono text-cyan-500 mt-0.5">
              {overview?.registrations_today ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Returning Check-Ins</span>
            <div className="text-xl font-bold font-mono text-emerald-500 mt-0.5">
              {overview?.check_ins_today ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Predominant Expression</span>
            <div className="text-xl font-bold text-amber-500 mt-0.5 flex items-center gap-1.5">
              <span>{EMOTION_EMOJIS[overview?.most_common_expression || ''] || '😐'}</span>
              <span>{overview?.most_common_expression ?? 'Neutral'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Table */}
      <div className="rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Facial Expression Category Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-4">Expression Category</th>
                <th className="py-2.5 px-4">Observed Count</th>
                <th className="py-2.5 px-4">Share of Total</th>
                <th className="py-2.5 px-4">Typical Action Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expressions.map((item) => (
                <tr key={item.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{EMOTION_EMOJIS[item.label] || '😐'}</span>
                      <span>{item.label}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{item.count}</td>
                  <td className="py-3 px-4 font-mono text-indigo-500 font-medium">
                    {item.percentage}%
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {item.label === 'Happy' && 'Zygomaticus major (smile lift), Cheek squint'}
                    {item.label === 'Surprised' && 'Frontalis (brow lift), Jaw drop, Eye wide'}
                    {item.label === 'Sad' && 'Depressor anguli oris, Brow inner lift'}
                    {item.label === 'Angry' && 'Corrugator supercilii (furrow), Eye squint'}
                    {item.label === 'Fearful' && 'Eye wide, Brow inner lift, Lip stretch'}
                    {item.label === 'Disgusted' && 'Levator labii superioris (nose sneer)'}
                    {item.label === 'Neutral' && 'Resting baseline facial configuration'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
