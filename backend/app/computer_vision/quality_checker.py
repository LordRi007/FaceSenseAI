import cv2
import numpy as np
from typing import Dict, Any, Tuple

class ImageQualityChecker:
    """
    Checks face image quality for participant snapshot storage:
    - Blur detection via Laplacian variance
    - Brightness analysis (mean luminance)
    - Face dimension and aspect ratio checks
    """
    def __init__(
        self,
        min_blur_threshold: float = 40.0,
        min_brightness: float = 40.0,
        max_brightness: float = 225.0,
        min_face_size: int = 70
    ):
        self.min_blur_threshold = min_blur_threshold
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.min_face_size = min_face_size

    def evaluate_face_crop(self, face_img: np.ndarray) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Evaluates a cropped face image.
        Returns: (is_good_quality, quality_score_0_to_1, details_dict)
        """
        if face_img is None or face_img.size == 0:
            return False, 0.0, {"error": "Empty face image"}

        h, w = face_img.shape[:2]
        if h < self.min_face_size or w < self.min_face_size:
            return False, 0.2, {
                "error": f"Face too small ({w}x{h} < {self.min_face_size}px)",
                "size_ok": False,
                "blur_ok": False,
                "brightness_ok": False
            }

        # Convert to grayscale
        if len(face_img.shape) == 3:
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = face_img

        # 1. Blur check via Laplacian variance
        blur_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_ok = blur_var >= self.min_blur_threshold

        # 2. Brightness check (mean gray value)
        mean_brightness = float(np.mean(gray))
        brightness_ok = (self.min_brightness <= mean_brightness <= self.max_brightness)

        # 3. Contrast check (standard deviation)
        contrast = float(np.std(gray))
        contrast_ok = contrast >= 20.0

        # Overall composite score (0.0 to 1.0)
        blur_norm = min(1.0, blur_var / 250.0)
        bright_dist = abs(mean_brightness - 128.0) / 128.0
        bright_norm = max(0.0, 1.0 - bright_dist)
        contrast_norm = min(1.0, contrast / 60.0)

        quality_score = round(0.4 * blur_norm + 0.3 * bright_norm + 0.3 * contrast_norm, 3)
        is_valid = blur_ok and brightness_ok and contrast_ok

        details = {
            "blur_score": round(blur_var, 1),
            "blur_ok": blur_ok,
            "brightness": round(mean_brightness, 1),
            "brightness_ok": brightness_ok,
            "contrast": round(contrast, 1),
            "size": f"{w}x{h}",
            "size_ok": True,
            "is_valid": is_valid
        }

        return is_valid, quality_score, details

quality_checker = ImageQualityChecker()

