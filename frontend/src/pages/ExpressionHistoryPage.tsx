import React, { useState, useEffect } from 'react';
import { getExpressionHistory } from '../services/api';
import { ExpressionEvent, EmotionLabel, EMOTION_EMOJIS } from '../types';
import {
  History,
  Filter,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';

const EMOTIONS: (EmotionLabel | 'All')[] = [
  'All',
  'Happy',
  'Neutral',
  'Surprised',
  'Sad',
  'Angry',
  'Fearful',
  'Disgusted',
];

export const ExpressionHistoryPage: React.FC = () => {
  const [events, setEvents] = useState<ExpressionEvent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('All');
  const [page, setPage] = useState<number>(0);
  const [limit] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    getExpressionHistory({
      expression: selectedEmotion === 'All' ? undefined : selectedEmotion,
      skip: page * limit,
      limit,
    })
      .then((data: { items: ExpressionEvent[]; total: number }) => {
        setEvents(data.items);
        setTotalCount(data.total);
      })
      .catch((err: any) => console.error('History load error:', err))
      .finally(() => setIsLoading(false));
  }, [selectedEmotion, page]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-500" />
            <span>Expression History Log</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit log of facial mood estimates recorded for consented participants and active sessions.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 text-xs font-semibold">
          {totalCount} Total Event Records
        </span>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {EMOTIONS.map((emotion) => (
          <button
            key={emotion}
            onClick={() => {
              setSelectedEmotion(emotion);
              setPage(0);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedEmotion === emotion
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {emotion !== 'All' && <span>{EMOTION_EMOJIS[emotion] || ''}</span>}
            <span>{emotion}</span>
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Participant Record</th>
                <th className="py-3 px-4">Predicted Expression</th>
                <th className="py-3 px-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading expression records...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No expression events found matching criteria.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      #{e.id}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {new Date(e.recorded_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      Session #{e.session_id}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {e.participant_id ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          ID: {e.participant_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Session Anonymous</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <span>{EMOTION_EMOJIS[e.expression_label] || '😐'}</span>
                        <span>{e.expression_label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200">
                      {Math.round(e.confidence * 100)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {page * limit + 1}–{Math.min(totalCount, (page + 1) * limit)} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= totalCount}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
