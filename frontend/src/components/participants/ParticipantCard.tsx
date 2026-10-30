import React from 'react';
import { Participant, EmotionLabel, EMOTION_EMOJIS } from '../../types';
import {
  Calendar,
  Clock,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ParticipantCardProps {
  participant: Participant;
  onViewDetails: (participant: Participant) => void;
  onDelete: (id: number) => void;
}

const EMOTION_COLORS: Record<EmotionLabel | string, string> = {
  Happy: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  Surprised: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  Sad: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  Angry: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  Fearful: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  Disgusted: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  Neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  onViewDetails,
  onDelete,
}) => {
  const formattedDate = new Date(participant.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const lastCheckIn = participant.last_check_in_at
    ? new Date(participant.last_check_in_at).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No check-ins';

  const exprClass = participant.last_expression
    ? EMOTION_COLORS[participant.last_expression] || EMOTION_COLORS.Neutral
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  return (
    <div className="rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Photo Header */}
        <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
          <img
            src={participant.photo_path}
            alt={participant.participant_code}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Participant Code Badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 font-mono text-xs font-bold text-white shadow-lg">
            {participant.participant_code}
          </div>

          {/* Consent Status Badge */}
          <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-emerald-500/80 backdrop-blur-md text-white shadow-lg" title="Consent Approved">
            <ShieldCheck className="w-4 h-4" />
          </div>

          {/* Last Observed Expression Overlay with Emoji */}
          {participant.last_expression && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-md ${exprClass}`}
              >
                <span>{EMOTION_EMOJIS[participant.last_expression] || '😐'}</span>
                <span>{participant.last_expression}</span>
              </span>
              {participant.last_expression_confidence && (
                <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-full backdrop-blur-md">
                  {Math.round(participant.last_expression_confidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-2.5">
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {participant.display_name || 'Anonymous Participant'}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Registered {formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Total Check-Ins:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {participant.check_ins_count}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={() => onViewDetails(participant)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View Details</span>
        </button>

        <button
          onClick={() => onDelete(participant.id)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Delete Participant Record"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

