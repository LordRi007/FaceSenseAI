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
    isWsConnected,
    engineMode,
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
      className="relative w-full aspect-[4/3] sm:aspect-video lg:aspect-[16/10] max-h-[70vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center group"
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
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] sm:text-xs font-medium text-white shadow-lg pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </div>

            {/* AI Engine Status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] sm:text-xs font-medium shadow-lg pointer-events-auto ${
              engineMode === 'websocket'
                ? 'bg-slate-900/80 border-slate-700/60 text-emerald-400'
                : engineMode === 'http_fallback'
                ? 'bg-slate-900/80 border-cyan-700/60 text-cyan-400'
                : 'bg-amber-950/80 border-amber-700/60 text-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${engineMode === 'websocket' ? 'bg-emerald-400' : engineMode === 'http_fallback' ? 'bg-cyan-400' : 'bg-amber-400 animate-ping'}`} />
              <span className="hidden xs:inline">{engineMode === 'websocket' ? 'AI: WebSocket' : engineMode === 'http_fallback' ? 'AI: HTTP Online' : 'Connecting AI...'}</span>
              <span className="xs:hidden">{engineMode === 'websocket' ? 'WS' : engineMode === 'http_fallback' ? 'HTTP' : 'Wait'}</span>
            </div>

            {/* FPS & Resolution */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-mono text-cyan-300 shadow-lg pointer-events-auto">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{liveFps} FPS</span>
              <span className="text-slate-500">•</span>
              <span>{resolution.width}x{resolution.height}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Active Faces Pill */}
            <div className="flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] sm:text-xs font-medium text-amber-300 shadow-lg">
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span>{faces.length} {faces.length === 1 ? 'Face' : 'Faces'}</span>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

