import React, { useState, useEffect } from 'react';
import { useScanner } from '../../contexts/ScannerContext';
import { getParticipants, checkInParticipant } from '../../services/api';
import { Participant } from '../../types';
import {
  LogIn,
  Search,
  Check,
  X,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export const CheckInModal: React.FC = () => {
  const {
    isCheckInModalOpen,
    setIsCheckInModalOpen,
    selectedTrack,
    sessionId,
  } = useScanner();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckInModalOpen) {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedParticipantId(null);

      getParticipants({ limit: 50 })
        .then((data) => setParticipants(data.items))
        .catch((err) => console.error('Failed to load participants:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isCheckInModalOpen]);

  if (!isCheckInModalOpen || !selectedTrack) return null;

  const filtered = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.participant_code.toLowerCase().includes(term) ||
      (p.display_name && p.display_name.toLowerCase().includes(term))
    );
  });

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId) {
      setErrorMessage('Please select a registered participant to link.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await checkInParticipant(selectedParticipantId, {
        session_id: sessionId,
        session_tracking_id: selectedTrack.session_tracking_id,
      });

      setSuccessMessage(res.message || 'Participant checked in successfully!');
      setTimeout(() => {
        setIsCheckInModalOpen(false);
      }, 1400);
    } catch (err: any) {
      console.error('Check-in error:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to check in participant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Returning Participant Check-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Associating Track <span className="font-mono text-cyan-500">{selectedTrack.session_tracking_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckInModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code (P00001) or name..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Participant Select List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading participants...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No participants found.</div>
          ) : (
            filtered.map((p) => {
              const isSelected = selectedParticipantId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParticipantId(p.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <img
                    src={p.photo_path}
                    alt={p.participant_code}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {p.participant_code}
                      </span>
                      {p.display_name && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          • {p.display_name}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Check-ins: {p.check_ins_count}
                    </p>
                  </div>
                  {isSelected && (
                    <UserCheck className="w-5 h-5 text-cyan-500 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Status Message */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsCheckInModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={isSubmitting || !selectedParticipantId}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-600/25 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? 'Checking In...' : 'Confirm Check-In'}
          </button>
        </div>
      </div>
    </div>
  );
};

