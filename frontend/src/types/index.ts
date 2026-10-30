export type EmotionLabel =
  | 'Happy'
  | 'Sad'
  | 'Angry'
  | 'Surprised'
  | 'Neutral'
  | 'Fearful'
  | 'Disgusted'
  | 'Uncertain';

export const EMOTION_EMOJIS: Record<EmotionLabel | string, string> = {
  Happy: '😊',
  Surprised: '😲',
  Sad: '😢',
  Angry: '😡',
  Fearful: '😱',
  Disgusted: '🤢',
  Neutral: '😐',
  Uncertain: '🤔',
};

export interface BoundingBox {
  x: number;      // 0.0 - 1.0 normalized
  y: number;      // 0.0 - 1.0 normalized
  width: number;  // 0.0 - 1.0 normalized
  height: number; // 0.0 - 1.0 normalized
}

export interface DetectedFace {
  session_tracking_id: string;
  participant_id?: number | null;
  participant_code?: string | null;
  display_name?: string | null;
  is_registered: boolean;
  expression: EmotionLabel;
  confidence: number;
  all_scores: Record<string, number>;
  bounding_box: BoundingBox;
  status: string;
  quality_score: number;
  brightness_ok: boolean;
  blur_ok: boolean;
  size_ok: boolean;
}

export interface FrameAnalysisPayload {
  event: string;
  timestamp: string;
  fps: number;
  active_tracks: number;
  faces: DetectedFace[];
}

export interface Participant {
  id: number;
  participant_code: string;
  display_name?: string | null;
  photo_path: string;
  created_at: string;
  updated_at: string;
  consent_status: string;
  consent_timestamp: string;
  opt_in_history: boolean;
  last_expression?: EmotionLabel | null;
  last_expression_confidence?: number | null;
  last_check_in_at?: string | null;
  check_ins_count: number;
}

export interface CheckIn {
  id: number;
  participant_id: number;
  session_id: number;
  checked_in_at: string;
}

export interface ExpressionEvent {
  id: number;
  participant_id?: number | null;
  session_id: number;
  expression_label: EmotionLabel;
  confidence: number;
  recorded_at: string;
}

export interface ParticipantDetail extends Participant {
  check_ins: CheckIn[];
  expression_history: ExpressionEvent[];
}

export interface AnalyticsOverview {
  total_participants: number;
  active_face_tracks: number;
  registrations_today: number;
  check_ins_today: number;
  predictions_today: number;
  most_common_expression: string;
  most_common_expression_percentage: number;
}

export interface ExpressionDistributionItem {
  label: EmotionLabel;
  count: number;
  percentage: number;
}

export interface DailyTrendItem {
  date: string;
  total: number;
  happy?: number;
  sad?: number;
  angry?: number;
  surprised?: number;
  neutral?: number;
  fearful?: number;
  disgusted?: number;
}

export interface WeeklyTrendItem {
  day: string;
  count: number;
  avg_confidence: number;
}

export interface ParticipantCohortItem {
  period: string;
  new_participants: number;
  returning_check_ins: number;
}

export interface ConfidenceBucket {
  range: string;
  count: number;
}

export interface SessionTimelineItem {
  session_id: number;
  camera_label: string;
  started_at: string;
  ended_at?: string | null;
  status: string;
  total_events: number;
}

export interface AppSettings {
  id: number;
  camera_id: string;
  detection_confidence: number;
  analysis_interval: number;
  save_history: boolean;
  retention_days: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  groupId?: string;
}

