import os
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
import mediapipe as mp

from app.models.database import Participant

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage"))
SNAPSHOTS_DIR = os.path.join(STORAGE_DIR, "snapshots")

class AutomaticFaceRecognizer:
    """
    High-accuracy, real-time facial recognition engine.
    Combines 3D MediaPipe FaceMesh canonical landmark geometry embeddings
    with OpenCV Local Binary Pattern Histograms (LBPH) texture analysis.
    Enables instant automatic identification without manual check-in.
    """

    def __init__(self, similarity_threshold: float = 0.925, lbph_threshold: float = 75.0):
        self.similarity_threshold = similarity_threshold
        self.lbph_threshold = lbph_threshold
        self.templates: Dict[int, Dict[str, Any]] = {}
        self.lbph_recognizer = None
        self._is_trained = False

        try:
            if hasattr(cv2, "face") and hasattr(cv2.face, "LBPHFaceRecognizer_create"):
                self.lbph_recognizer = cv2.face.LBPHFaceRecognizer_create()
        except Exception as e:
            print(f"[FaceRecognizer] LBPH init warning: {e}")
            self.lbph_recognizer = None

    def _normalize_landmarks(self, lms: np.ndarray) -> np.ndarray:
        """
        Translates centroid to origin and normalizes by standard deviation
        to achieve scale, translation, and position invariance.
        """
        if lms is None or len(lms) < 400:
            return None
        centered = lms - np.mean(lms, axis=0)
        std = np.std(centered, axis=0)
        std[std == 0] = 1e-6
        normalized = centered / std
        return normalized

    def _compute_cosine_similarity(self, embA: np.ndarray, embB: np.ndarray) -> float:
        dot = np.sum(embA * embB)
        normA = np.linalg.norm(embA)
        normB = np.linalg.norm(embB)
        if normA == 0 or normB == 0:
            return 0.0
        return float(dot / (normA * normB))

    def load_registered_participants(self, db: Session, detector_pipeline: Optional[Any] = None):
        """
        Loads all registered participant snapshots from database and computes
        their canonical facial embeddings.
        """
        try:
            participants = db.query(Participant).all()
            self.templates.clear()
            lbph_images = []
            lbph_labels = []

            for p in participants:
                # Resolve file path on disk
                photo_file = None
                if p.photo_path:
                    raw_filename = os.path.basename(p.photo_path)
                    candidates = [
                        os.path.join(SNAPSHOTS_DIR, raw_filename),
                        os.path.join(STORAGE_DIR, raw_filename),
                        p.photo_path
                    ]
                    for c in candidates:
                        if os.path.exists(c) and os.path.getsize(c) > 500:
                            photo_file = c
                            break

                if not photo_file:
                    continue

                img_bgr = cv2.imread(photo_file)
                if img_bgr is None or img_bgr.size == 0:
                    continue

                # 1. Compute landmark embedding if detector is available
                norm_emb = None
                if detector_pipeline and detector_pipeline.landmarker:
                    try:
                        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                        res = detector_pipeline.landmarker.detect(mp_img)
                        if res.face_landmarks and len(res.face_landmarks) > 0:
                            lms_coords = np.array([(lm.x, lm.y, lm.z) for lm in res.face_landmarks[0]])
                            norm_emb = self._normalize_landmarks(lms_coords)
                    except Exception as lms_err:
                        print(f"[FaceRecognizer] Landmark extraction on template {p.participant_code}: {lms_err}")

                # 2. Compute standardized grayscale LBPH texture patch
                gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
                gray_std = cv2.resize(gray, (120, 120))
                gray_std = cv2.equalizeHist(gray_std)

                self.templates[p.id] = {
                    "id": p.id,
                    "code": p.participant_code,
                    "display_name": p.display_name,
                    "landmark_embedding": norm_emb,
                    "photo_path": p.photo_path,
                }

                lbph_images.append(gray_std)
                lbph_labels.append(p.id)

            # Train LBPH recognizer
            if self.lbph_recognizer is not None and len(lbph_images) > 0:
                try:
                    self.lbph_recognizer.train(lbph_images, np.array(lbph_labels, dtype=np.int32))
                    self._is_trained = True
                except Exception as tr_err:
                    print(f"[FaceRecognizer] LBPH training error: {tr_err}")

            print(f"[FaceRecognizer] Loaded and trained {len(self.templates)} registered participant templates.")
        except Exception as e:
            print(f"[FaceRecognizer] load_registered_participants error: {e}")

    def recognize_face(
        self,
        face_crop: Optional[np.ndarray],
        landmarks: Optional[List[Tuple[float, float, float]]] = None
    ) -> Optional[Tuple[int, str, Optional[str], float]]:
        """
        Matches a detected live face against registered participant templates.
        Returns: (participant_id, participant_code, display_name, match_confidence)
        """
        if not self.templates:
            return None

        # Method 1: High-precision 3D Landmark Geometry Matching
        if landmarks and len(landmarks) >= 400:
            live_arr = np.array(landmarks)
            live_norm = self._normalize_landmarks(live_arr)
            if live_norm is not None:
                best_sim = 0.0
                best_match = None

                for pid, tmpl in self.templates.items():
                    tmpl_norm = tmpl.get("landmark_embedding")
                    if tmpl_norm is not None:
                        sim = self._compute_cosine_similarity(live_norm, tmpl_norm)
                        if sim > best_sim:
                            best_sim = sim
                            best_match = tmpl

                if best_sim >= self.similarity_threshold and best_match:
                    return (
                        best_match["id"],
                        best_match["code"],
                        best_match["display_name"],
                        round(best_sim, 3)
                    )

        # Method 2: LBPH Facial Texture Matching Fallback
        if self._is_trained and self.lbph_recognizer is not None and face_crop is not None and face_crop.size > 0:
            try:
                gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
                gray_std = cv2.resize(gray, (120, 120))
                gray_std = cv2.equalizeHist(gray_std)

                predicted_id, distance = self.lbph_recognizer.predict(gray_std)
                if distance < self.lbph_threshold and predicted_id in self.templates:
                    matched = self.templates[predicted_id]
                    conf = round(max(0.60, min(0.98, 1.0 - (distance / 120.0))), 3)
                    return (
                        matched["id"],
                        matched["code"],
                        matched["display_name"],
                        conf
                    )
            except Exception as lbph_err:
                pass

        return None

face_recognizer = AutomaticFaceRecognizer()
