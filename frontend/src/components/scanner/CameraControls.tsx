import React from 'react';
import { useScanner } from '../../contexts/ScannerContext';
import {
  Camera,
  Play,
  Square,
  SwitchCamera,
  Sliders,
  Cpu,
  Monitor,
} from 'lucide-react';

export const CameraControls: React.FC = () => {
  const {
    devices,
    selectedDeviceId,
    isStreaming,
    resolution,
    startCamera,
    stopCamera,
    switchCamera,
  } = useScanner();

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
      {/* Camera Selector */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
          <Camera className="w-5 h-5" />
        </div>
        <div className="flex-1 md:w-64">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Video Input Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => switchCamera(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera (${device.deviceId.slice(0, 8)}...)`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Start / Stop Controls */}
      <div className="flex items-center gap-3">
        {isStreaming ? (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/25 transition-all cursor-pointer"
          >
            <Square className="w-4 h-4" />
            <span>Stop Camera</span>
          </button>
        ) : (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Camera</span>
          </button>
        )}

        {devices.length > 1 && (
          <button
            onClick={() => {
              const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
              const nextIndex = (currentIndex + 1) % devices.length;
              switchCamera(devices[nextIndex].deviceId);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            title="Cycle Next Camera"
          >
            <SwitchCamera className="w-4 h-4" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        )}
      </div>

      {/* Hardware Status Information */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Monitor className="w-4 h-4 text-cyan-500" />
          <span>Res: <strong className="text-slate-800 dark:text-slate-200">{resolution.width || 0}x{resolution.height || 0}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-indigo-500" />
          <span>Model: <strong className="text-slate-800 dark:text-slate-200">MediaPipe FACS</strong></span>
        </div>
      </div>
    </div>
  );
};

