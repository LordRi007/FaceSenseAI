import axios from 'axios';
import {
  Participant,
  ParticipantDetail,
  AnalyticsOverview,
  ExpressionDistributionItem,
  DailyTrendItem,
  WeeklyTrendItem,
  ParticipantCohortItem,
  ConfidenceBucket,
  SessionTimelineItem,
  AppSettings,
  ExpressionEvent
} from '../types';

const apiBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Scanner APIs
export const getScannerStatus = async () => {
  const res = await api.get('/scanner/status');
  return res.data;
};

export const startScannerSession = async (cameraLabel: string) => {
  const res = await api.post('/scanner/session', { camera_label: cameraLabel });
  return res.data;
};

export const stopScannerSession = async () => {
  const res = await api.post('/scanner/stop');
  return res.data;
};

// Cameras APIs
export const getKnownCameras = async () => {
  const res = await api.get('/cameras');
  return res.data;
};

// Participants APIs
export const getParticipants = async (params?: {
  search?: string;
  sort_by?: string;
  skip?: number;
  limit?: number;
}) => {
  const res = await api.get<{
    items: Participant[];
    total: number;
    skip: number;
    limit: number;
  }>('/participants', { params });
  return res.data;
};

export const getParticipantDetail = async (id: number): Promise<ParticipantDetail> => {
  const res = await api.get<ParticipantDetail>(`/participants/${id}`);
  return res.data;
};

export const registerParticipant = async (data: {
  display_name?: string;
  consent_status: string;
  opt_in_history: boolean;
  session_tracking_id?: string;
  captured_image_base64?: string;
  initial_expression?: string;
  initial_confidence?: number;
}) => {
  const res = await api.post('/participants', data);
  return res.data;
};

export const checkInParticipant = async (
  id: number,
  data: { session_id?: number; camera_label?: string; session_tracking_id?: string }
) => {
  const res = await api.post(`/participants/${id}/check-in`, data);
  return res.data;
};

export const deleteParticipant = async (id: number) => {
  const res = await api.delete(`/participants/${id}`);
  return res.data;
};

// Analytics APIs
export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await api.get<AnalyticsOverview>('/analytics/overview');
  return res.data;
};

export const getExpressionDistribution = async (): Promise<ExpressionDistributionItem[]> => {
  const res = await api.get<ExpressionDistributionItem[]>('/analytics/expressions');
  return res.data;
};

export const getTrends = async (): Promise<{
  daily_trends: DailyTrendItem[];
  weekly_trends: WeeklyTrendItem[];
}> => {
  const res = await api.get('/analytics/trends');
  return res.data;
};

export const getParticipantAnalytics = async (): Promise<{
  cohorts: ParticipantCohortItem[];
  confidence_distribution: ConfidenceBucket[];
}> => {
  const res = await api.get('/analytics/participants');
  return res.data;
};

export const getSessionTimeline = async (): Promise<SessionTimelineItem[]> => {
  const res = await api.get<SessionTimelineItem[]>('/analytics/sessions');
  return res.data;
};

export const getExpressionHistory = async (params?: {
  expression?: string;
  limit?: number;
  skip?: number;
}): Promise<{ items: ExpressionEvent[]; total: number }> => {
  const res = await api.get('/analytics/history', { params });
  return res.data;
};

// Settings APIs
export const getSettings = async (): Promise<AppSettings> => {
  const res = await api.get<AppSettings>('/settings');
  return res.data;
};

export const updateSettings = async (data: Partial<AppSettings>): Promise<AppSettings> => {
  const res = await api.put<AppSettings>('/settings', data);
  return res.data;
};

export default api;

