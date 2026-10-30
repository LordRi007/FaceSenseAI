import React, { useState } from 'react';
import { useScanner } from '../contexts/ScannerContext';
import { CameraFeed } from '../components/scanner/CameraFeed';
import { CameraControls } from '../components/scanner/CameraControls';
import { TrackCard } from '../components/scanner/TrackCard';
import { DetectedFace } from '../types';
import {
  ScanFace,
  Users,
  Activity,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LiveScannerPage: React.FC = () => {
  const {
    faces,
    isStreaming,
    setSelectedTrack,
    setIsRegisterModalOpen,
    setIsCheckInModalOpen,
  } = useScanner();

  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  const handleRegister = (face: DetectedFace) => {
    setSelectedTrack(face);
    setIsRegisterModalOpen(true);
  };

  const handleCheckIn = (face: DetectedFace) => {
    setSelectedTrack(face);
    setIsCheckInModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Live Face Scanner
            </h2>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Autonomous
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-face tracking and facial expression classification using MediaPipe FACS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isMirrored
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {isMirrored ? 'Mirrored (Front Cam)' : 'Standard View'}
          </button>
        </div>
      </div>

      {/* Main Grid: Live Camera Stream + Right Side Tracks Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Camera Feed (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <CameraFeed isMirrored={isMirrored} />
          <CameraControls />
        </div>

        {/* Right Column: Active Face Tracks & Live Telemetry (1 col) */}
        <div className="space-y-4 flex flex-col">
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Active Session Tracks
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500">
              {faces.length} Visible
            </span>
          </div>

          {/* Track Cards List */}
          <div className="flex-1 space-y-3 min-h-[300px]">
            {faces.length === 0 ? (
              <div className="h-64 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <ScanFace className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No Human Faces Detected
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[200px]">
                    Position your face in front of the camera. The scanner tracks automatically.
                  </p>
                </div>
              </div>
            ) : (
              faces.map((face: DetectedFace) => (
                <TrackCard
                  key={face.session_tracking_id}
                  face={face}
                  onRegister={handleRegister}
                  onCheckIn={handleCheckIn}
                />
              ))
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="p-3.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/15 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Snapshots are captured <strong>only after explicit participant registration consent</strong>. Anonymous
              faces are discarded when the session ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
