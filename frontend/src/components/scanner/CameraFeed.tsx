import React, { useRef } from 'react';
import { useScanner } from '../../contexts/ScannerContext';
import { FaceOverlayCanvas } from './FaceOverlayCanvas';
import {
  Camera,
  CameraOff,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';

interface CameraFeedProps {
  isMirrored?: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ isMirrored = true }) => {
  const {
    videoRef,
    isStreaming,
    hasPermission,
    error,
    resolution,
    liveFps,
    faces,
    activeTracksCount,
    startCamera,
  } = useScanner();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video md:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center group"
    >
      {/* Real Hardware Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-transform ${
          isMirrored ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* Face Overlay Canvas */}
      {isStreaming && (
        <FaceOverlayCanvas
          faces={faces}
          videoRef={videoRef}
          isMirrored={isMirrored}
        />
      )}

      {/* Top Floating Telemetry Overlay */}
      {isStreaming && (
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-white shadow-lg pointer-events-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>SCANNING LIVE</span>
            </div>

            {/* FPS & Resolution */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-mono text-cyan-300 shadow-lg pointer-events-auto">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{liveFps} FPS</span>
              <span className="text-slate-500">•</span>
              <span>{resolution.width}x{resolution.height}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Active Faces Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-amber-300 shadow-lg">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>{faces.length} {faces.length === 1 ? 'Face Detected' : 'Faces Detected'}</span>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Permission Denied or Camera Error State */}
      {!isStreaming && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
            {error ? <AlertTriangle className="w-8 h-8 text-amber-400" /> : <CameraOff className="w-8 h-8" />}
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-semibold text-white">
              {error ? 'Camera Access Required' : 'Camera is Inactive'}
            </h3>
            <p className="text-xs text-slate-400">
              {error || 'Grant browser permission to scan real-time facial expressions through your device webcam.'}
            </p>
          </div>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Start Live Camera</span>
          </button>
        </div>
      )}

      {/* Subtle Bottom Watermark Disclaimer */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
          FaceSense AI • Real-Time Facial Expression Estimation (Non-Diagnostic)
        </p>
      </div>
    </div>
  );
};

