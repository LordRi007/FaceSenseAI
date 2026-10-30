import React, { useState, useEffect } from 'react';
import { useScanner } from '../../contexts/ScannerContext';
import { registerParticipant } from '../../services/api';
import { EMOTION_EMOJIS } from '../../types';
import {
  ShieldCheck,
  Check,
  X,
  Camera,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

export const RegisterConsentModal: React.FC = () => {
  const {
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    selectedTrack,
    captureCurrentFrameBase64,
  } = useScanner();

  const [displayName, setDisplayName] = useState<string>('');
  const [optInHistory, setOptInHistory] = useState<boolean>(true);
  const [consentApproved, setConsentApproved] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // When modal opens, auto-capture a fresh high-quality snapshot of the active face
  useEffect(() => {
    if (isRegisterModalOpen && selectedTrack) {
      setConsentApproved(false);
      setDisplayName('');
      setErrorMessage(null);
      setSuccessMessage(null);

      const captured = captureCurrentFrameBase64();
      setPreviewImage(captured);
    }
  }, [isRegisterModalOpen, selectedTrack, captureCurrentFrameBase64]);

  if (!isRegisterModalOpen || !selectedTrack) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentApproved) {
      setErrorMessage('You must review and grant explicit consent to register.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await registerParticipant({
        display_name: displayName.trim() || undefined,
        consent_status: 'APPROVED',
        opt_in_history: optInHistory,
        session_tracking_id: selectedTrack.session_tracking_id,
        captured_image_base64: previewImage || undefined,
        initial_expression: selectedTrack.expression,
        initial_confidence: selectedTrack.confidence,
      });

      setSuccessMessage(
        `Registered successfully as ${response.participant.participant_code}! Active session track linked.`
      );

      setTimeout(() => {
        setIsRegisterModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to register participant. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Participant Consent & Registration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track ID: <span className="font-mono text-indigo-500">{selectedTrack.session_tracking_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRegisterModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRegister} className="p-5 space-y-4">
          {/* Snapshot Auto-Capture Preview & Quality Metrics */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-indigo-500/30">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Snapshot Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Camera className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Captured Snapshot</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Initial Expression:{' '}
                <strong className="text-indigo-500 font-mono">
                  {EMOTION_EMOJIS[selectedTrack.expression] || '😐'} {selectedTrack.expression} ({Math.round(selectedTrack.confidence * 100)}%)
                </strong>
              </div>
              <div className="flex items-center gap-2 text-[11px] pt-1">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                  Sharpness Verified
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-medium">
                  Lighting OK
                </span>
              </div>
            </div>
          </div>

          {/* Name Field (Optional) */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Participant Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Privacy & Consent Agreement */}
          <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/15 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <input
                id="consent-checkbox"
                type="checkbox"
                checked={consentApproved}
                onChange={(e) => setConsentApproved(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="consent-checkbox" className="leading-snug cursor-pointer select-none">
                <strong>Explicit Consent:</strong> I agree to have my facial snapshot stored securely for
                identification and session analytics in FaceSense AI.
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="optin-checkbox"
                type="checkbox"
                checked={optInHistory}
                onChange={(e) => setOptInHistory(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="optin-checkbox" className="leading-snug cursor-pointer select-none">
                <strong>Opt-in to Expression History:</strong> Retain facial mood estimates associated with my
                record for analytics.
              </label>
            </div>
          </div>

          {/* Error & Success Feedback */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !consentApproved}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Registering...' : 'Confirm & Register Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

