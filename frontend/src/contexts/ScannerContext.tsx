import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { wsClient } from '../services/websocket';
import { DetectedFace, CameraDeviceInfo } from '../types';
import { startScannerSession, stopScannerSession } from '../services/api';

interface ScannerContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  hasPermission: boolean | null;
  error: string | null;
  resolution: { width: number; height: number };
  devices: CameraDeviceInfo[];
  selectedDeviceId: string;
  startCamera: () => void;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  
  // Real-time CV metadata
  faces: DetectedFace[];
  activeTracksCount: number;
  liveFps: number;
  isWsConnected: boolean;
  sessionId: number;

  // Selected Track for registration / check-in modal
  selectedTrack: DetectedFace | null;
  setSelectedTrack: (track: DetectedFace | null) => void;
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
  isCheckInModalOpen: boolean;
  setIsCheckInModalOpen: (open: boolean) => void;
  
  // Helpers
  captureCurrentFrameBase64: () => string | null;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export const ScannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const camera = useCamera({ autoStart: true });
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [activeTracksCount, setActiveTracksCount] = useState<number>(0);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<number>(1);

  const [selectedTrack, setSelectedTrack] = useState<DetectedFace | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);

  const frameIntervalRef = useRef<any>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize hidden canvas for frame extraction
  useEffect(() => {
    hiddenCanvasRef.current = document.createElement('canvas');
  }, []);

  // Connect WebSocket & start session
  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.onStatus((connected) => {
      setIsWsConnected(connected);
    });

    const unsubMsg = wsClient.onMessage((data) => {
      if (data.event === 'faces_detected') {
        setFaces(data.faces);
        setActiveTracksCount(data.active_tracks);
        if (data.fps > 0) {
          setLiveFps(data.fps);
        }
      }
    });

    // Notify backend of session start
    startScannerSession('Real-Time Web Scanner')
      .then((s) => setSessionId(s.id))
      .catch((err) => console.warn('[ScannerContext] startScannerSession error:', err));

    return () => {
      unsubStatus();
      unsubMsg();
      wsClient.disconnect();
      stopScannerSession().catch(() => {});
    };
  }, []);

  // Helper to capture current frame as base64 JPEG
  const captureCurrentFrameBase64 = useCallback((): string | null => {
    const video = camera.videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

    const canvas = hiddenCanvasRef.current || document.createElement('canvas');
    // Scale down for transmission efficiency (e.g. 640x360 or 854x480)
    const targetWidth = 640;
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 360;
    const targetHeight = Math.max(120, Math.round((vHeight / vWidth) * targetWidth));

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [camera.videoRef]);

  // Frame sending loop over WebSocket
  useEffect(() => {
    if (!camera.isStreaming || !isWsConnected) {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      return;
    }

    // Send frame every 120ms (~8.3 FPS for CV inference, while local video renders at full 30-60 FPS)
    frameIntervalRef.current = setInterval(() => {
      const b64 = captureCurrentFrameBase64();
      if (b64) {
        wsClient.sendFrame(b64, sessionId, 'Browser Camera');
      }
    }, 120);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [camera.isStreaming, isWsConnected, sessionId, captureCurrentFrameBase64]);

  return (
    <ScannerContext.Provider
      value={{
        videoRef: camera.videoRef,
        isStreaming: camera.isStreaming,
        hasPermission: camera.hasPermission,
        error: camera.error,
        resolution: camera.resolution,
        devices: camera.devices,
        selectedDeviceId: camera.selectedDeviceId,
        startCamera: camera.startCamera,
        stopCamera: camera.stopCamera,
        switchCamera: camera.switchCamera,
        faces,
        activeTracksCount,
        liveFps,
        isWsConnected,
        sessionId,
        selectedTrack,
        setSelectedTrack,
        isRegisterModalOpen,
        setIsRegisterModalOpen,
        isCheckInModalOpen,
        setIsCheckInModalOpen,
        captureCurrentFrameBase64,
      }}
    >
      {children}
    </ScannerContext.Provider>
  );
};

export const useScanner = (): ScannerContextType => {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
};

