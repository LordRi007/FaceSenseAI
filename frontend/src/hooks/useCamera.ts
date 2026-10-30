import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraDeviceInfo } from '../types';

interface UseCameraOptions {
  autoStart?: boolean;
  preferredFacingMode?: 'user' | 'environment';
}

export const useCamera = (options: UseCameraOptions = { autoStart: true }) => {
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem('facesense_selected_camera') || '';
  });
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryTimeoutRef = useRef<any>(null);

  // Discover and enumerate cameras
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('MediaDevices API not supported by browser.');
      return [];
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
          groupId: d.groupId,
        }));

      setDevices(videoDevices);

      // Auto-selection preference:
      // 1. Saved camera in localStorage (if still connected)
      // 2. External USB camera (often contains 'usb', 'external', or 'webcam' in label)
      // 3. First available camera
      if (videoDevices.length > 0) {
        const saved = localStorage.getItem('facesense_selected_camera');
        const hasSaved = videoDevices.some((d) => d.deviceId === saved);

        if (hasSaved && saved) {
          setSelectedDeviceId(saved);
        } else {
          // Check for external USB preference
          const externalCam = videoDevices.find((d) =>
            /usb|external|logitech|droidcam/i.test(d.label)
          );
          const chosen = externalCam || videoDevices[0];
          setSelectedDeviceId(chosen.deviceId);
          localStorage.setItem('facesense_selected_camera', chosen.deviceId);
        }
      }
      return videoDevices;
    } catch (e: any) {
      console.error('[useCamera] enumerateDevices error:', e);
      setError('Failed to discover video input devices.');
      return [];
    }
  }, []);

  // Stop current active media stream cleanly
  const stopStream = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
  }, []);

  // Start real device camera stream
  const startStream = useCallback(
    async (targetDeviceId?: string) => {
      stopStream();
      setError(null);

      const deviceIdToUse = targetDeviceId || selectedDeviceId;

      // Progressive constraint strategy for maximum device compatibility
      const constraintCandidates: MediaStreamConstraints[] = [
        deviceIdToUse
          ? {
              audio: false,
              video: { deviceId: { ideal: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
            }
          : {
              audio: false,
              video: { facingMode: options.preferredFacingMode || 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            },
        {
          audio: false,
          video: { facingMode: options.preferredFacingMode || 'user' }
        },
        {
          audio: false,
          video: true
        }
      ];

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      for (const constraints of constraintCandidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (e) {
          lastErr = e;
          // Continue to simpler constraints
        }
      }

      if (!stream) {
        const err = lastErr || new Error('Unable to initialize video stream');
        console.error('[useCamera] getUserMedia all attempts failed:', err);
        setHasPermission(false);
        setIsStreaming(false);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access in browser permissions.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera hardware detected on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is currently in use by another application or OS service.');
        } else {
          setError(`Camera access error: ${err.message || 'Unknown error'}`);
        }
        return;
      }

      try {
        streamRef.current = stream;
        setHasPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((playErr) => {
            console.warn('[useCamera] Video play error:', playErr);
          });
        }

        // Listen for track ending (e.g. unplugged external webcam)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          setResolution({
            width: settings.width || 1280,
            height: settings.height || 720,
          });

          videoTrack.onended = () => {
            console.warn('[useCamera] Video track ended. Reconnecting...');
            setIsStreaming(false);
            // Auto retry reconnection after 2 seconds
            retryTimeoutRef.current = setTimeout(() => {
              startStream();
            }, 2000);
          };
        }

        setIsStreaming(true);
        // Refresh device list to capture actual labels now that permission is granted
        await refreshDevices();
      } catch (err: any) {
        console.error('[useCamera] Post stream setup error:', err);
        setError(`Camera display error: ${err.message || 'Unknown'}`);
      }
    },
    [options.preferredFacingMode, refreshDevices, selectedDeviceId, stopStream]
  );

  // Switch camera on the fly without refreshing
  const switchCamera = useCallback(
    async (newDeviceId: string) => {
      setSelectedDeviceId(newDeviceId);
      localStorage.setItem('facesense_selected_camera', newDeviceId);
      await startStream(newDeviceId);
    },
    [startStream]
  );

  // Auto initialize on mount if requested
  useEffect(() => {
    refreshDevices().then(() => {
      if (options.autoStart) {
        startStream();
      }
    });

    // Listen for device connect/disconnect events
    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);

    return () => {
      stopStream();
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, []);

  return {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    hasPermission,
    error,
    resolution,
    startCamera: () => startStream(),
    stopCamera: stopStream,
    switchCamera,
    refreshDevices,
  };
};

