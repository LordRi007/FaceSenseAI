import time
import numpy as np
from typing import Dict, List, Optional, Tuple, Any

def calculate_iou(boxA: Tuple[float, float, float, float], boxB: Tuple[float, float, float, float]) -> float:
    # box format: (x, y, w, h)
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interW = max(0.0, xB - xA)
    interH = max(0.0, yB - yA)
    interArea = interW * interH

    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]

    unionArea = boxAArea + boxBArea - interArea
    if unionArea <= 0.0:
        return 0.0
    return interArea / unionArea

class TrackedFace:
    def __init__(self, track_id: str, bbox: Tuple[float, float, float, float]):
        self.track_id = track_id
        self.bbox = bbox  # (x, y, w, h) normalized
        self.missing_frames = 0
        self.consecutive_frames = 1
        self.first_seen = time.time()
        self.last_seen = time.time()
        
        # Participant association (if authorized / checked in)
        self.participant_id: Optional[int] = None
        self.participant_code: Optional[str] = None
        self.display_name: Optional[str] = None
        self.is_registered: bool = False

        # Latest predictions
        self.expression: str = "Neutral"
        self.confidence: float = 0.8
        self.all_scores: Dict[str, float] = {}

        # Best quality snapshot candidate
        self.best_snapshot_score: float = 0.0
        self.best_snapshot_crop: Optional[np.ndarray] = None
        self.best_snapshot_bbox: Optional[Tuple[float, float, float, float]] = None

    def update(self, bbox: Tuple[float, float, float, float]):
        self.bbox = bbox
        self.missing_frames = 0
        self.consecutive_frames += 1
        self.last_seen = time.time()

    def update_snapshot_candidate(self, crop: np.ndarray, score: float, bbox: Tuple[float, float, float, float]):
        if score > self.best_snapshot_score:
            self.best_snapshot_score = score
            self.best_snapshot_crop = crop.copy()
            self.best_snapshot_bbox = bbox

class SessionFaceTracker:
    """
    Session-based face tracker matching faces across frames via IoU and centroid distance.
    Maintains temporary tracking IDs (T001, T002...) for the active camera session.
    """
    def __init__(self, max_missing_frames: int = 15, iou_threshold: float = 0.25):
        self.max_missing_frames = max_missing_frames
        self.iou_threshold = iou_threshold
        self.next_id_counter = 1
        self.tracks: Dict[str, TrackedFace] = {}

    def _next_track_id(self) -> str:
        tid = f"T{self.next_id_counter:03d}"
        self.next_id_counter += 1
        return tid

    def update_tracks(
        self,
        detected_boxes: List[Tuple[float, float, float, float]]
    ) -> List[Tuple[str, Tuple[float, float, float, float], bool]]:
        """
        Matches detected bounding boxes with existing tracks.
        Returns list of (track_id, bbox, is_new)
        """
        matched_results = []
        unmatched_detections = list(range(len(detected_boxes)))
        existing_track_ids = list(self.tracks.keys())

        # Build IoU cost matrix
        if existing_track_ids and detected_boxes:
            for det_idx in list(unmatched_detections):
                det_box = detected_boxes[det_idx]
                best_iou = 0.0
                best_tid = None

                for tid in existing_track_ids:
                    t_box = self.tracks[tid].bbox
                    iou = calculate_iou(det_box, t_box)
                    if iou > best_iou:
                        best_iou = iou
                        best_tid = tid

                if best_iou >= self.iou_threshold and best_tid is not None:
                    self.tracks[best_tid].update(det_box)
                    matched_results.append((best_tid, det_box, False))
                    unmatched_detections.remove(det_idx)
                    existing_track_ids.remove(best_tid)

        # Remaining unmatched detections get new temporary IDs
        for det_idx in unmatched_detections:
            new_tid = self._next_track_id()
            det_box = detected_boxes[det_idx]
            new_track = TrackedFace(new_tid, det_box)
            self.tracks[new_tid] = new_track
            matched_results.append((new_tid, det_box, True))

        # Remaining existing tracks that weren't matched increment missing counter
        for tid in existing_track_ids:
            self.tracks[tid].missing_frames += 1

        # Prune dead tracks
        dead_tracks = [
            tid for tid, track in self.tracks.items()
            if track.missing_frames > self.max_missing_frames
        ]
        for tid in dead_tracks:
            self.tracks.pop(tid, None)

        return matched_results

    def link_participant(self, track_id: str, participant_id: int, code: str, name: Optional[str] = None):
        """Link an active session track to a recognized/checked-in participant."""
        if track_id in self.tracks:
            track = self.tracks[track_id]
            track.participant_id = participant_id
            track.participant_code = code
            track.display_name = name
            track.is_registered = True

    def get_track(self, track_id: str) -> Optional[TrackedFace]:
        return self.tracks.get(track_id)

    def reset(self):
        """Reset all active tracks (e.g. when camera session restarts)."""
        self.tracks.clear()
        self.next_id_counter = 1

tracker = SessionFaceTracker()

