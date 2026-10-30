import { FrameAnalysisPayload } from '../types';

type MessageCallback = (data: FrameAnalysisPayload) => void;
type StatusCallback = (connected: boolean) => void;

class ScannerWebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectTimer: any = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private isExplicitlyClosed: boolean = false;

  constructor() {
    if (import.meta.env.VITE_WS_URL) {
      this.url = import.meta.env.VITE_WS_URL;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // If in dev with Vite proxy or direct port
      const host = window.location.port === '3000'
        ? `${window.location.hostname}:8000`
        : window.location.host;
      this.url = `${protocol}//${host}/ws/face-analysis`;
    }
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.notifyStatus(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: FrameAnalysisPayload = JSON.parse(event.data);
          this.messageListeners.forEach((callback) => callback(data));
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      this.socket.onclose = () => {
        this.notifyStatus(false);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err);
        this.socket?.close();
      };
    } catch (e) {
      console.error('[WebSocket] Init failed:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  public sendFrame(imageBase64: string, sessionId: number = 1, cameraLabel: string = 'Browser Camera') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = JSON.stringify({
      image: imageBase64,
      session_id: sessionId,
      camera_label: cameraLabel,
    });

    this.socket.send(payload);
  }

  public onMessage(callback: MessageCallback) {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  public onStatus(callback: StatusCallback) {
    this.statusListeners.add(callback);
    callback(this.isConnected());
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((cb) => cb(connected));
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifyStatus(false);
  }
}

export const wsClient = new ScannerWebSocketClient();

