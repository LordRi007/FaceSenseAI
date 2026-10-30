import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { wsClient } from '../services/websocket';
import { DetectedFace, CameraDeviceInfo } from '../types';
import { startScannerSession, stopScannerSession, processFrameHttp } from '../services/api';

export type EngineMode = 'websocket' | 'http_fallback' | 'connecting';

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
  engineMode: EngineMode;
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
  const [engineMode, setEngineMode] = useState<EngineMode>('connecting');
  const [sessionId, setSessionId] = useState<number>(1);

  const [selectedTrack, setSelectedTrack] = useState<DetectedFace | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);

  const frameIntervalRef = useRef<any>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastFrameTimestampRef = useRef<number>(Date.now());

  // Initialize hidden canvas for frame extraction
  useEffect(() => {
    hiddenCanvasRef.current = document.createElement('canvas');
  }, []);

  // Connect WebSocket & start session
  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.onStatus((connected) => {
      setIsWsConnected(connected);
      setEngineMode(connected ? 'websocket' : 'http_fallback');
    });

    const unsubMsg = wsClient.onMessage((data) => {
      isProcessingRef.current = false;
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
    if (!video || video.readyState === 0 || !video.videoWidth || !video.videoHeight) return null;

    const canvas = hiddenCanvasRef.current || document.createElement('canvas');
    // 640px width offers optimal balance between bandwidth and computer vision precision
    const targetWidth = 640;
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;
    const targetHeight = Math.max(120, Math.round((vHeight / vWidth) * targetWidth));

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.82);
  }, [camera.videoRef]);

  // Dual-mode frame sending loop (WebSocket with HTTP fallback)
  useEffect(() => {
    if (!camera.isStreaming) {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      return;
    }

    // Interval tick every 100ms
    frameIntervalRef.current = setInterval(async () => {
      // Flow control / backpressure check:
      const now = Date.now();
      if (isProcessingRef.current && (now - lastFrameTimestampRef.current < 400)) {
        return;
      }

      const b64 = captureCurrentFrameBase64();
      if (!b64) return;

      isProcessingRef.current = true;
      lastFrameTimestampRef.current = now;

      if (isWsConnected) {
        // High-speed WebSocket streaming
        setEngineMode('websocket');
        wsClient.sendFrame(b64, sessionId, 'Browser Camera');
        // Safety watchdog: clear processing flag after 400ms if server packet was delayed
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 400);
      } else {
        // Resilient HTTP Fallback for cloud environments or proxies blocking WebSockets
        try {
          setEngineMode('http_fallback');
          const resp = await processFrameHttp({
            image: b64,
            session_id: sessionId,
            camera_label: 'Browser Camera Fallback'
          });
          if (resp && resp.faces) {
            setFaces(resp.faces);
            setActiveTracksCount(resp.active_tracks);
            const dt = (Date.now() - now) / 1000;
            if (dt > 0) {
              setLiveFps(Math.round(1.0 / dt));
            }
          }
        } catch (httpErr) {
          console.warn('[ScannerContext] HTTP frame fallback error:', httpErr);
        } finally {
          isProcessingRef.current = false;
        }
      }
    }, 100);

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
        engineMode,
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

