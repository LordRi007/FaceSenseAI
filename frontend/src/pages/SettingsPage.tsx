import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api';
import { AppSettings } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import {
  Settings,
  ShieldCheck,
  Moon,
  Sun,
  Sliders,
  Clock,
  Save,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0.6);
  const [analysisInterval, setAnalysisInterval] = useState<number>(150);
  const [saveHistory, setSaveHistory] = useState<boolean>(true);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    getSettings()
      .then((data: AppSettings) => {
        setSettings(data);
        setDetectionConfidence(data.detection_confidence);
        setAnalysisInterval(data.analysis_interval);
        setSaveHistory(data.save_history);
        setRetentionDays(data.retention_days);
      })
      .catch((err: any) => console.error('Settings load error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateSettings({
        detection_confidence: detectionConfidence,
        analysis_interval: analysisInterval,
        save_history: saveHistory,
        retention_days: retentionDays,
      });
      setSettings(updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Update settings failed:', err);
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          <span>System Settings & Configuration</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Tune AI inference sensitivity, adjust frame analysis rates, and configure biometric retention.
        </p>
      </div>

      {/* Mandatory Non-Diagnostic Privacy Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1.5 flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-300">
            Psychological & Emotional State Disclaimer
          </h4>
          <p className="leading-relaxed">
            FaceSense AI evaluates visible facial muscle movements and estimates facial expression categories
            (FACS action units). It <strong>does not diagnose, detect, or guarantee</strong> a person's genuine internal
            psychological, psychiatric, or emotional state.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Computer Vision & Detection Thresholds */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Computer Vision & Expression Inference</span>
          </h3>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Minimum Detection Confidence Threshold
              </label>
              <span className="font-mono text-indigo-500 font-bold">
                {Math.round(detectionConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={detectionConfidence}
              onChange={(e) => setDetectionConfidence(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400">
              Predictions below this confidence level are labeled as "Uncertain" to prevent false assumptions.
            </p>
          </div>

          {/* Analysis Interval */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Frame Analysis Ingestion Interval
              </label>
              <span className="font-mono text-indigo-500 font-bold">
                {analysisInterval} ms
              </span>
            </div>
            <input
              type="range"
              min="80"
              max="500"
              step="10"
              value={analysisInterval}
              onChange={(e) => setAnalysisInterval(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400">
              Controls WebSocket transmission frequency. Lower values provide higher responsiveness; higher values reduce CPU usage.
            </p>
          </div>
        </div>

        {/* Data Retention & Privacy */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Biometric Data & Retention Rules</span>
          </h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Persist Expression Events for Opted-in Participants
              </span>
              <p className="text-[11px] text-slate-400">
                When disabled, expression predictions are strictly session-only and never saved to the database.
              </p>
            </div>
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => setSaveHistory(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Automatic Data Retention Period
            </label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value))}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7">7 Days (Strict Privacy)</option>
              <option value="30">30 Days (Standard Analytics)</option>
              <option value="90">90 Days (Quarterly Audit)</option>
              <option value="365">1 Year (Long-Term Cohort)</option>
            </select>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Application Visual Theme
            </span>
            <p className="text-[11px] text-slate-400">
              Dark mode is configured as the default UI theme.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Switch to Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span>Switch to Dark</span>
              </>
            )}
          </button>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center justify-end gap-3">
          {isSaved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Settings Saved Successfully!</span>
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
