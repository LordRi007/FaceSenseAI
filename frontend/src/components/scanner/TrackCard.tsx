import React from 'react';
import { DetectedFace, EmotionLabel, EMOTION_EMOJIS } from '../../types';
import {
  UserPlus,
  LogIn,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface TrackCardProps {
  face: DetectedFace;
  onRegister: (face: DetectedFace) => void;
  onCheckIn: (face: DetectedFace) => void;
}

const EMOTION_BADGES: Record<EmotionLabel | string, { bg: string; text: string; border: string }> = {
  Happy: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  Surprised: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  Sad: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20' },
  Angry: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
  Fearful: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  Disgusted: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  Neutral: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  Uncertain: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
};

export const TrackCard: React.FC<TrackCardProps> = ({ face, onRegister, onCheckIn }) => {
  const badge = EMOTION_BADGES[face.expression] || EMOTION_BADGES.Neutral;
  const confPercent = Math.round(face.confidence * 100);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/40 transition-all space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {face.participant_code || face.session_tracking_id}
          </span>
          {face.is_registered ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Registered</span>
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Session Anonymous
            </span>
          )}
        </div>

        {/* Expression Badge with Emoji */}
        <span
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
        >
          <span>{EMOTION_EMOJIS[face.expression] || '😐'}</span>
          <span>{face.expression}</span>
        </span>
      </div>

      {/* Participant Name if authorized */}
      {face.display_name && (
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Name: <span className="text-cyan-500">{face.display_name}</span>
        </div>
      )}

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Confidence</span>
          <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
            {confPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${confPercent}%` }}
          />
        </div>
      </div>

      {/* Quality Telemetry Indicators */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] text-center">
        <div
          className={`p-1 rounded ${
            face.blur_ok
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          {face.blur_ok ? 'Sharp' : 'Blurry'}
        </div>
        <div
          className={`p-1 rounded ${
            face.brightness_ok
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          {face.brightness_ok ? 'Light OK' : 'Bad Light'}
        </div>
        <div
          className={`p-1 rounded ${
            face.size_ok
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-500'
          }`}
        >
          {face.size_ok ? 'Visible' : 'Far'}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800/80">
        {!face.is_registered ? (
          <>
            <button
              onClick={() => onRegister(face)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
            <button
              onClick={() => onCheckIn(face)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Check In</span>
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-emerald-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authorized Check-In</span>
            </span>
            <span className="font-mono text-[11px]">No Snapshot Needed</span>
          </div>
        )}
      </div>
    </div>
  );
};

