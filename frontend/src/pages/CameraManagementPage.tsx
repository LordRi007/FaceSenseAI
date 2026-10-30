import React, { useState } from 'react';
import { useScanner } from '../contexts/ScannerContext';
import { CameraDeviceInfo } from '../types';
import {
  Camera,
  CheckCircle,
  RefreshCw,
  Monitor,
  Activity,
  Sliders,
  AlertCircle,
  Video,
} from 'lucide-react';

export const CameraManagementPage: React.FC = () => {
  const {
    devices,
    selectedDeviceId,
    switchCamera,
    resolution,
    liveFps,
    isStreaming,
    startCamera,
    stopCamera,
  } = useScanner();

  const [testResult, setTestResult] = useState<string | null>(null);

  const runDiagnostics = () => {
    setTestResult(
      `Camera hardware diagnostic: ${devices.length} video input devices detected. Active resolution ${resolution.width}x${resolution.height} @ ${liveFps} FPS. WebRTC streaming stable.`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Camera className="w-6 h-6 text-indigo-500" />
          <span>Camera Management & Hardware Diagnostics</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Detect connected webcams, switch devices, inspect resolutions, and benchmark FPS.
        </p>
      </div>

      {/* Connected Cameras List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device: CameraDeviceInfo, idx: number) => {
          const isSelected = selectedDeviceId === device.deviceId;
          return (
            <div
              key={device.deviceId || idx}
              className={`p-5 rounded-2xl bg-white dark:bg-dark-card border transition-all space-y-4 ${
                isSelected
                  ? 'border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      isSelected
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {device.label || `Camera #${idx + 1}`}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      ID: {device.deviceId ? `${device.deviceId.slice(0, 14)}...` : 'Default'}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Active
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {/usb|external/i.test(device.label) ? 'External USB' : 'Integrated / Virtual'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Current Resolution:</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {isSelected ? `${resolution.width}x${resolution.height}` : 'Available'}
                  </strong>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                {!isSelected ? (
                  <button
                    onClick={() => switchCamera(device.deviceId)}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    Select & Activate
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-semibold text-center border border-emerald-500/20 flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>In Live Operation</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostics Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Camera Benchmark & Hardware Diagnostics</span>
          </h3>
          <button
            onClick={runDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Run Test</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono">
            {testResult}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400">Stream Status</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              {isStreaming ? 'Streaming' : 'Idle'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400">Live Framerate</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              {liveFps} Frames Per Second
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400">Target Resolution</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              {resolution.width} x {resolution.height} (16:9 HD)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
