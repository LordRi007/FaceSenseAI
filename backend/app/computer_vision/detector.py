import base64
import os
import time
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from typing import List, Tuple, Optional, Dict, Any

from app.schemas.schemas import DetectedFace, BoundingBox
from app.computer_vision.expression_classifier import classifier
from app.computer_vision.tracker import tracker
from app.computer_vision.quality_checker import quality_checker

MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "face_landmarker.task")
)
HAAR_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "haarcascade_frontalface_default.xml")
)

class FaceVisionPipeline:
    """
    High-performance Computer Vision pipeline using MediaPipe FaceLandmarker with blendshapes
    and OpenCV fallback.
    """

    def __init__(self):
        self.landmarker = None
        self._init_landmarker()

        # Fallback Haar Cascade
        self.haar_cascade = None
        try:
            haar_candidates = [
                HAAR_PATH,
                os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"),
                os.path.join(os.getcwd(), "models", "haarcascade_frontalface_default.xml"),
                "/app/backend/models/haarcascade_frontalface_default.xml"
            ]
            for hp in haar_candidates:
                if os.path.exists(hp) and os.path.getsize(hp) > 10000:
                    casc = cv2.CascadeClassifier(hp)
                    if not casc.empty():
                        self.haar_cascade = casc
                        print(f"[FaceVisionPipeline] Fallback Haar Cascade loaded from {hp}")
                        break
        except Exception as herr:
            print(f"[FaceVisionPipeline] Warning: Haar cascade init: {herr}")

    def _init_landmarker(self):
        candidate_paths = [
            MODEL_PATH,
            os.path.join(os.getcwd(), "models", "face_landmarker.task"),
            os.path.join(os.getcwd(), "backend", "models", "face_landmarker.task"),
            "/app/backend/models/face_landmarker.task",
            "/app/models/face_landmarker.task"
        ]

        chosen_path = None
        for p in candidate_paths:
            if os.path.exists(p) and os.path.getsize(p) > 1000000:
                chosen_path = p
                break

        # Auto-download model asset if missing (ensures seamless cloud deployment)
        if not chosen_path:
            try:
                import urllib.request
                os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
                print(f"[FaceVisionPipeline] Downloading face_landmarker.task to {MODEL_PATH}...")
                model_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
                urllib.request.urlretrieve(model_url, MODEL_PATH)
                print("[FaceVisionPipeline] Download complete.")
                if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 1000000:
                    chosen_path = MODEL_PATH
            except Exception as dl_err:
                print(f"[FaceVisionPipeline] Warning: Could not download model asset: {dl_err}")

        if chosen_path and os.path.exists(chosen_path):
            try:
                with open(chosen_path, "rb") as f:
                    model_bytes = f.read()
                base_options = mp_python.BaseOptions(model_asset_buffer=model_bytes)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    output_face_blendshapes=True,
                    output_facial_transformation_matrixes=False,
                    num_faces=5,
                    min_face_detection_confidence=0.4,
                    min_face_presence_confidence=0.4,
                    min_tracking_confidence=0.4
                )
                self.landmarker = vision.FaceLandmarker.create_from_options(options)
                print(f"[FaceVisionPipeline] MediaPipe FaceLandmarker initialized with blendshapes from {chosen_path}.")
            except Exception as e:
                print(f"[FaceVisionPipeline] Model buffer initialization failed, attempting file path: {e}")
                try:
                    base_options = mp_python.BaseOptions(model_asset_path=chosen_path)
                    options = vision.FaceLandmarkerOptions(
                        base_options=base_options,
                        output_face_blendshapes=True,
                        output_facial_transformation_matrixes=False,
                        num_faces=5,
                        min_face_detection_confidence=0.4,
                        min_face_presence_confidence=0.4,
                        min_tracking_confidence=0.4
                    )
                    self.landmarker = vision.FaceLandmarker.create_from_options(options)
                    print(f"[FaceVisionPipeline] MediaPipe FaceLandmarker initialized from file path.")
                except Exception as e2:
                    print(f"[FaceVisionPipeline] Critical: Could not initialize FaceLandmarker: {e2}")
                    self.landmarker = None

    def decode_frame(self, frame_data: Any) -> Optional[np.ndarray]:
        """
        Decodes incoming base64 or raw JPEG bytes into BGR numpy array.
        """
        try:
            if isinstance(frame_data, str):
                if "," in frame_data:
                    frame_data = frame_data.split(",", 1)[1]
                img_bytes = base64.b64decode(frame_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                return img
            elif isinstance(frame_data, bytes):
                np_arr = np.frombuffer(frame_data, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                return img
            return None
        except Exception as e:
            print(f"[FaceVisionPipeline] decode_frame error: {e}")
            return None

    def process_frame(
        self,
        frame_bgr: np.ndarray,
        session_id: Optional[int] = None
    ) -> List[DetectedFace]:
        if frame_bgr is None or frame_bgr.size == 0:
            return []

        h, w = frame_bgr.shape[:2]
        frame_rgb = np.ascontiguousarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB), dtype=np.uint8)
        raw_detections = []

        # 1. MediaPipe FaceLandmarker with Blendshapes
        if self.landmarker is not None:
            try:
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                result = self.landmarker.detect(mp_img)

                if result.face_landmarks:
                    for face_idx, landmarks in enumerate(result.face_landmarks):
                        lms_coords = [(lm.x, lm.y, lm.z) for lm in landmarks]

                        xs = [lm[0] for lm in lms_coords]
                        ys = [lm[1] for lm in lms_coords]
                        min_x, max_x = min(xs), max(xs)
                        min_y, max_y = min(ys), max(ys)

                        box_w = max_x - min_x
                        box_h = max_y - min_y
                        pad_x = box_w * 0.15
                        pad_y = box_h * 0.15

                        bx = max(0.0, min_x - pad_x)
                        by = max(0.0, min_y - pad_y * 1.5)
                        bw = min(1.0 - bx, box_w + pad_x * 2)
                        bh = min(1.0 - by, box_h + pad_y * 2)

                        px1 = max(0, int(bx * w))
                        py1 = max(0, int(by * h))
                        px2 = min(w, int((bx + bw) * w))
                        py2 = min(h, int((by + bh) * h))

                        face_crop = frame_bgr[py1:py2, px1:px2]

                        # Extract blendshape dictionary for this face
                        blendshapes_dict = {}
                        if result.face_blendshapes and face_idx < len(result.face_blendshapes):
                            for cat in result.face_blendshapes[face_idx]:
                                blendshapes_dict[cat.category_name] = cat.score

                        raw_detections.append({
                            "bbox": (round(bx, 4), round(by, 4), round(bw, 4), round(bh, 4)),
                            "landmarks": lms_coords,
                            "blendshapes": blendshapes_dict,
                            "crop": face_crop
                        })
            except Exception as e:
                print(f"[FaceVisionPipeline] Landmarker detect error: {e}")

        # 2. Fallback to Haar Cascade
        if not raw_detections and self.haar_cascade is not None:
            try:
                gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
                faces = self.haar_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30)
                )
                for (fx, fy, fw, fh) in faces:
                    bx = round(float(fx) / w, 4)
                    by = round(float(fy) / h, 4)
                    bw = round(float(fw) / w, 4)
                    bh = round(float(fh) / h, 4)
                    crop = frame_bgr[fy:fy+fh, fx:fx+fw]
                    raw_detections.append({
                        "bbox": (bx, by, bw, bh),
                        "landmarks": None,
                        "blendshapes": None,
                        "crop": crop
                    })
            except Exception as e:
                print(f"[FaceVisionPipeline] Haar error: {e}")

        if not raw_detections:
            tracker.update_tracks([])
            # Return active tracks that were visible in the last 2 frames for smooth tracking persistence
            smoothed_faces: List[DetectedFace] = []
            for tid, t_obj in tracker.tracks.items():
                if t_obj.missing_frames <= 2 and t_obj.bbox:
                    smoothed_faces.append(
                        DetectedFace(
                            session_tracking_id=tid,
                            participant_id=t_obj.participant_id,
                            participant_code=t_obj.participant_code,
                            display_name=t_obj.display_name,
                            is_registered=t_obj.is_registered,
                            expression=t_obj.expression,
                            confidence=round(t_obj.confidence, 3),
                            all_scores=t_obj.all_scores,
                            bounding_box=BoundingBox(
                                x=t_obj.bbox[0],
                                y=t_obj.bbox[1],
                                width=t_obj.bbox[2],
                                height=t_obj.bbox[3]
                            ),
                            status="Tracking",
                            quality_score=0.8,
                            brightness_ok=True,
                            blur_ok=True,
                            size_ok=True
                        )
                    )
            return smoothed_faces

        # Update Session Tracker
        detected_boxes = [d["bbox"] for d in raw_detections]
        matched_tracks = tracker.update_tracks(detected_boxes)

        output_faces: List[DetectedFace] = []
        active_tids = []

        for idx, (tid, bbox, is_new) in enumerate(matched_tracks):
            active_tids.append(tid)
            det = raw_detections[idx] if idx < len(raw_detections) else None
            if not det:
                continue

            crop = det["crop"]
            landmarks = det["landmarks"]
            blendshapes = det["blendshapes"]

            # Quality Check
            is_valid_quality, quality_score, quality_details = quality_checker.evaluate_face_crop(crop)

            # Expression Classification
            expression, confidence, all_scores = classifier.classify(
                blendshapes=blendshapes,
                landmarks=landmarks,
                track_id=tid
            )

            # Update Tracker State
            tracked_obj = tracker.get_track(tid)
            if tracked_obj:
                tracked_obj.expression = expression
                tracked_obj.confidence = confidence
                tracked_obj.all_scores = all_scores
                if is_valid_quality and crop is not None and crop.size > 0:
                    tracked_obj.update_snapshot_candidate(crop, quality_score, bbox)

                is_reg = tracked_obj.is_registered
                p_id = tracked_obj.participant_id
                p_code = tracked_obj.participant_code
                d_name = tracked_obj.display_name
                status_str = f"Registered ({p_code})" if is_reg else ("New" if is_new else "Tracking")
            else:
                is_reg = False
                p_id = None
                p_code = None
                d_name = None
                status_str = "Tracking"

            face_result = DetectedFace(
                session_tracking_id=tid,
                participant_id=p_id,
                participant_code=p_code,
                display_name=d_name,
                is_registered=is_reg,
                expression=expression,
                confidence=round(confidence, 3),
                all_scores=all_scores,
                bounding_box=BoundingBox(
                    x=bbox[0],
                    y=bbox[1],
                    width=bbox[2],
                    height=bbox[3]
                ),
                status=status_str,
                quality_score=quality_score,
                brightness_ok=quality_details.get("brightness_ok", True),
                blur_ok=quality_details.get("blur_ok", True),
                size_ok=quality_details.get("size_ok", True)
            )
            output_faces.append(face_result)

        classifier.cleanup_tracks(active_tids)
        return output_faces

    def get_optimal_snapshot_for_track(self, track_id: str) -> Optional[np.ndarray]:
        tracked_obj = tracker.get_track(track_id)
        if tracked_obj and tracked_obj.best_snapshot_crop is not None:
            return tracked_obj.best_snapshot_crop
        return None

vision_pipeline = FaceVisionPipeline()
