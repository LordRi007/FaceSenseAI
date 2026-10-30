import React, { useState, useEffect } from 'react';
import { Participant, ParticipantDetail } from '../../types';
import { getParticipantDetail, deleteParticipant } from '../../services/api';
import {
  X,
  Calendar,
  ShieldCheck,
  Download,
  Trash2,
  Clock,
  Activity,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ParticipantDetailModalProps {
  participantId: number | null;
  onClose: () => void;
  onDeleted: () => void;
}

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  participantId,
  onClose,
  onDeleted,
}) => {
  const [detail, setDetail] = useState<ParticipantDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (participantId) {
      setIsLoading(true);
      getParticipantDetail(participantId)
        .then((data) => setDetail(data))
        .catch((err) => console.error('Failed to load participant detail:', err))
        .finally(() => setIsLoading(false));
    }
  }, [participantId]);

  if (!participantId) return null;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this participant record and their snapshot?')) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteParticipant(participantId);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete participant.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/participants/${participantId}/export?format=${format}`, '_blank');
  };

  const confidenceData = detail?.expression_history?.map((e, index) => ({
    index: `#${index + 1}`,
    confidence: Math.round(e.confidence * 100),
    expression: e.expression_label,
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Participant Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Code: <span className="font-mono text-indigo-500 font-semibold">{detail?.participant_code}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading || !detail ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading profile data...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Overview Grid */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <img
                src={detail.photo_path}
                alt={detail.participant_code}
                className="w-28 h-28 rounded-xl object-cover border-2 border-indigo-500/30 shrink-0 shadow-md"
              />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {detail.display_name || 'Anonymous Participant'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Consent Approved
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registered: {new Date(detail.created_at).toLocaleString()}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expression History Chart (If opted in) */}
            {detail.opt_in_history && confidenceData.length > 0 ? (
              <div className="space-y-2">
                <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>Observed Expression Confidence History</span>
                </h5>
                <div className="h-44 w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={confidenceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
                      <XAxis dataKey="index" stroke="#64748B" fontSize={10} />
                      <YAxis domain={[50, 100]} stroke="#64748B" fontSize={10} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#1E293B',
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="confidence"
                        name="Confidence"
                        stroke="#6366F1"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-xs text-slate-500 text-center">
                Expression history disabled or not yet collected for this participant.
              </div>
            )}

            {/* Check-In History Log */}
            <div className="space-y-2">
              <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span>Authorized Check-Ins ({detail.check_ins.length})</span>
              </h5>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {detail.check_ins.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No recorded check-ins.</div>
                ) : (
                  detail.check_ins.map((c) => (
                    <div key={c.id} className="p-2.5 text-xs flex items-center justify-between">
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        Session #{c.session_id}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(c.checked_in_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Participant & Snapshot'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

