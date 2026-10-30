import math
from typing import Dict, Tuple, List, Optional, Any

EMOTION_LABELS = [
    "Neutral",
    "Happy",
    "Sad",
    "Surprised",
    "Angry",
    "Fearful",
    "Disgusted"
]

class FacialExpressionClassifier:
    """
    State-of-the-art Facial Expression Classifier calibrated to FACS (Facial Action Coding System).
    Uses MediaPipe 52 facial blendshapes when available, plus geometric landmark analysis,
    with exponential moving average (EMA) temporal smoothing per active track ID.
    """

    def __init__(self, smoothing_alpha: float = 0.35, uncertainty_threshold: float = 0.25):
        self.smoothing_alpha = smoothing_alpha
        self.uncertainty_threshold = uncertainty_threshold
        # Track ID -> Dict[str, float] of smoothed probabilities
        self.track_history: Dict[str, Dict[str, float]] = {}

    def _dist(self, p1, p2) -> float:
        return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

    def classify(
        self,
        blendshapes: Optional[Dict[str, float]] = None,
        landmarks: Optional[List[Tuple[float, float, float]]] = None,
        track_id: Optional[str] = None
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Classifies facial expression into 7 standard categories.
        Returns: (display_label, confidence, all_probabilities)
        """
        scores = {e: 0.06 for e in EMOTION_LABELS}
        scores["Neutral"] = 0.45  # Solid resting baseline default

        if blendshapes:
            # MediaPipe FACS Blendshapes
            b = blendshapes

            # 1. Happy (AU12 Lip Corner Puller + AU6 Cheek Raiser)
            smile_avg = (b.get("mouthSmileLeft", 0.0) + b.get("mouthSmileRight", 0.0)) / 2.0
            cheek_avg = (b.get("cheekSquintLeft", 0.0) + b.get("cheekSquintRight", 0.0)) / 2.0
            mouth_dimple = (b.get("mouthDimpleLeft", 0.0) + b.get("mouthDimpleRight", 0.0)) / 2.0
            happy_score = (smile_avg * 3.0) + (cheek_avg * 1.0) + (mouth_dimple * 0.4)
            if smile_avg > 0.14 or happy_score > 0.22:
                scores["Happy"] += happy_score * 2.5
                scores["Neutral"] *= max(0.05, 1.0 - happy_score * 1.8)

            # 2. Surprised (AU26 Jaw Drop + AU1/AU2 Brow Raiser + AU5 Eye Widener)
            jaw_open = b.get("jawOpen", 0.0)
            brow_inner_up = b.get("browInnerUp", 0.0)
            eye_wide = (b.get("eyeWideLeft", 0.0) + b.get("eyeWideRight", 0.0)) / 2.0
            surprise_score = (jaw_open * 1.8) + (brow_inner_up * 1.5) + (eye_wide * 1.2)
            if jaw_open > 0.22 and (brow_inner_up > 0.18 or eye_wide > 0.18):
                scores["Surprised"] += surprise_score * 2.0
                scores["Neutral"] *= max(0.1, 1.0 - surprise_score * 1.3)

            # 3. Angry (FACS AU4 Brow Lowerer REQUIRED + AU9 Nose Wrinkler / AU23 Lip Press)
            # Dark glasses frames and hair can cast shadows on eyebrows; genuine anger requires true brow lowering
            brow_down = (b.get("browDownLeft", 0.0) + b.get("browDownRight", 0.0)) / 2.0
            nose_sneer = (b.get("noseSneerLeft", 0.0) + b.get("noseSneerRight", 0.0)) / 2.0
            mouth_press = (b.get("mouthPressLeft", 0.0) + b.get("mouthPressRight", 0.0)) / 2.0
            eye_squint = (b.get("eyeSquintLeft", 0.0) + b.get("eyeSquintRight", 0.0)) / 2.0
            angry_score = (brow_down * 2.8) + (nose_sneer * 1.5) + (mouth_press * 0.8) + (eye_squint * 0.4)
            # Must have significant brow-down (AU4) or nose sneer (AU9) to prevent neutral resting faces with glasses from false triggering
            if (brow_down > 0.24 or nose_sneer > 0.26) and angry_score > 0.40:
                scores["Angry"] += angry_score * 2.0
                scores["Neutral"] *= max(0.1, 1.0 - angry_score * 1.4)

            # 4. Sad (AU15 Lip Corner Depressor + AU1 Inner Brow Raiser)
            mouth_frown = (b.get("mouthFrownLeft", 0.0) + b.get("mouthFrownRight", 0.0)) / 2.0
            mouth_stretch = (b.get("mouthStretchLeft", 0.0) + b.get("mouthStretchRight", 0.0)) / 2.0
            sad_score = (mouth_frown * 2.5) + (brow_inner_up * 0.8) + (mouth_stretch * 0.4)
            if mouth_frown > 0.20 and smile_avg < 0.10:
                scores["Sad"] += sad_score * 2.0
                scores["Neutral"] *= max(0.1, 1.0 - sad_score * 1.2)

            # 5. Fearful (AU1+AU2 Brow Raiser + AU5 Eye Widener + AU20 Lip Stretcher)
            fear_score = (eye_wide * 2.0) + (brow_inner_up * 1.4) + (jaw_open * 0.8) + (mouth_stretch * 0.6)
            if eye_wide > 0.25 and brow_inner_up > 0.20 and smile_avg < 0.12:
                scores["Fearful"] += fear_score * 2.0
                scores["Neutral"] *= max(0.1, 1.0 - fear_score * 1.2)

            # 6. Disgusted (AU9 Nose Wrinkler + AU10 Upper Lip Raiser)
            mouth_upper_up = (b.get("mouthUpperUpLeft", 0.0) + b.get("mouthUpperUpRight", 0.0)) / 2.0
            disgust_score = (nose_sneer * 2.6) + (mouth_upper_up * 1.8) + (eye_squint * 0.6)
            if (nose_sneer > 0.24 or mouth_upper_up > 0.24) and disgust_score > 0.35:
                scores["Disgusted"] += disgust_score * 2.0
                scores["Neutral"] *= max(0.1, 1.0 - disgust_score * 1.2)

        elif landmarks and len(landmarks) >= 468:
            # Fallback to geometric landmark calculations
            p_chin = landmarks[152]
            p_forehead = landmarks[10]
            face_height = max(0.001, self._dist(p_forehead, p_chin))

            p_mouth_l = landmarks[61]
            p_mouth_r = landmarks[291]
            p_lip_top = landmarks[0]
            p_lip_bot = landmarks[17]
            mouth_center_y = (p_lip_top[1] + p_lip_bot[1]) / 2.0
            mouth_corners_y = (p_mouth_l[1] + p_mouth_r[1]) / 2.0
            smile_lift = (mouth_center_y - mouth_corners_y) / face_height

            if smile_lift > 0.015:
                scores["Happy"] += min(1.2, smile_lift * 35.0)
                scores["Neutral"] *= 0.4
            elif smile_lift < -0.012:
                scores["Sad"] += min(1.0, abs(smile_lift) * 30.0)
                scores["Neutral"] *= 0.5

        # Softmax normalization
        exp_scores = {k: math.exp(v * 2.2) for k, v in scores.items()}
        total_exp = sum(exp_scores.values())
        raw_probs = {k: round(v / total_exp, 4) for k, v in exp_scores.items()}

        # Temporal EMA smoothing per track ID
        if track_id:
            if track_id in self.track_history:
                prev_probs = self.track_history[track_id]
                smoothed_probs = {}
                for k in EMOTION_LABELS:
                    prev_val = prev_probs.get(k, raw_probs[k])
                    smoothed_val = (self.smoothing_alpha * raw_probs[k]) + ((1.0 - self.smoothing_alpha) * prev_val)
                    smoothed_probs[k] = round(smoothed_val, 4)
                s_sum = sum(smoothed_probs.values())
                smoothed_probs = {k: round(v / s_sum, 4) for k, v in smoothed_probs.items()}
                self.track_history[track_id] = smoothed_probs
                final_probs = smoothed_probs
            else:
                self.track_history[track_id] = raw_probs
                final_probs = raw_probs
        else:
            final_probs = raw_probs

        best_label = max(final_probs, key=final_probs.get)
        confidence = final_probs[best_label]

        if confidence < self.uncertainty_threshold:
            display_label = "Uncertain"
        else:
            display_label = best_label

        return display_label, confidence, final_probs

    def cleanup_tracks(self, active_track_ids: List[str]):
        keys_to_remove = [k for k in self.track_history if k not in active_track_ids]
        for k in keys_to_remove:
            self.track_history.pop(k, None)

classifier = FacialExpressionClassifier()
