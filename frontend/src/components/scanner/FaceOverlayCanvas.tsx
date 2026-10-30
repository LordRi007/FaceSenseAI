import React, { useEffect, useRef } from 'react';
import { DetectedFace, EmotionLabel, EMOTION_EMOJIS } from '../../types';

interface FaceOverlayCanvasProps {
  faces: DetectedFace[];
  videoRef: React.RefObject<HTMLVideoElement>;
  isMirrored?: boolean;
}

const EMOTION_COLORS: Record<EmotionLabel | string, { border: string; text: string }> = {
  Happy: { border: '#10B981', text: '#34D399' },
  Surprised: { border: '#F59E0B', text: '#FBBF24' },
  Sad: { border: '#0284C7', text: '#38BDF8' },
  Angry: { border: '#F43F5E', text: '#FB7185' },
  Fearful: { border: '#8B5CF6', text: '#A78BFA' },
  Disgusted: { border: '#EA580C', text: '#FB923C' },
  Neutral: { border: '#06B6D4', text: '#22D3EE' },
  Uncertain: { border: '#EAB308', text: '#FACC15' },
};

export const FaceOverlayCanvas: React.FC<FaceOverlayCanvasProps> = ({
  faces,
  videoRef,
  isMirrored = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let animationFrameId: number;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = video.getBoundingClientRect();
      const displayW = rect.width;
      const displayH = rect.height;

      if (displayW <= 0 || displayH <= 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      ctx.clearRect(0, 0, displayW, displayH);

      const videoW = video.videoWidth || 640;
      const videoH = video.videoHeight || 480;

      // Calculate object-cover transformation to match browser video rendering
      const scale = Math.max(displayW / videoW, displayH / videoH);
      const renderedW = videoW * scale;
      const renderedH = videoH * scale;
      const offsetX = (displayW - renderedW) / 2;
      const offsetY = (displayH - renderedH) / 2;

      faces.forEach((face) => {
        const { bounding_box, expression, confidence, session_tracking_id, participant_code, display_name } = face;
        const colorSet = EMOTION_COLORS[expression] || EMOTION_COLORS.Neutral;
        const emoji = EMOTION_EMOJIS[expression] || '😐';

        // Bounding box dimensions
        const boxW = Math.max(30, bounding_box.width * renderedW);
        const boxH = Math.max(30, bounding_box.height * renderedH);

        // Precise coordinates accounting for horizontal mirror and object-cover offsets
        let boxX: number;
        if (isMirrored) {
          const mirroredNormX = Math.max(0.0, 1.0 - (bounding_box.x + bounding_box.width));
          boxX = offsetX + (mirroredNormX * renderedW);
        } else {
          boxX = offsetX + (bounding_box.x * renderedW);
        }
        const boxY = offsetY + (bounding_box.y * renderedH);

        // ---------------- ONLY TRACKING BORDER (NO FILL) ----------------
        ctx.strokeStyle = colorSet.border;
        ctx.lineWidth = 3.0;

        // High-visibility glow effect on border
        ctx.shadowColor = colorSet.border;
        ctx.shadowBlur = 12;

        // Draw perimeter outline (completely transparent inside)
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Reset shadow
        ctx.shadowBlur = 0;

        // Stylized corner brackets for tech tracking HUD look
        const cornerLen = Math.min(26, boxW * 0.25, boxH * 0.25);
        ctx.lineWidth = 5.0;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(boxX, boxY + cornerLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerLen, boxY);
        // Top-right
        ctx.moveTo(boxX + boxW - cornerLen, boxY);
        ctx.lineTo(boxX + boxW, boxY);
        ctx.lineTo(boxX + boxW, boxY + cornerLen);
        // Bottom-left
        ctx.moveTo(boxX, boxY + boxH - cornerLen);
        ctx.lineTo(boxX, boxY + boxH);
        ctx.lineTo(boxX + cornerLen, boxY + boxH);
        // Bottom-right
        ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
        ctx.stroke();

        // ---------------- Header Tag Above Bounding Box with Emoji ----------------
        const headerY = Math.max(8, boxY - 36);
        const isAuthorized = Boolean(face.is_registered || display_name);
        const idLabel = display_name ? `✓ ${display_name}` : (participant_code || session_tracking_id);
        const confPercent = Math.round(confidence * 100);
        const tagText = `${emoji} ${expression} ${confPercent}%  •  ${idLabel}`;

        ctx.font = 'bold 13px "Segoe UI Emoji", "Apple Color Emoji", Inter, sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const tagPadding = 12;
        const tagHeight = 30;

        // Tag background: solid dark backdrop with vibrant border (emerald if authorized)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = isAuthorized ? '#10B981' : colorSet.border;
        ctx.lineWidth = 2.0;

        const tagX = Math.max(6, Math.min(boxX, displayW - textWidth - tagPadding * 2 - 10));

        // Draw tag pill
        ctx.beginPath();
        ctx.roundRect(tagX, headerY, textWidth + tagPadding * 2, tagHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Tag Text with Emoji
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tagText, tagX + tagPadding, headerY + 20);

        // Secondary participant code badge if registered
        if (participant_code && display_name) {
          ctx.font = '600 11px Inter, sans-serif';
          ctx.fillStyle = '#10B981';
          ctx.fillText(`Auto-Recognized: ${participant_code}`, tagX + tagPadding, headerY + tagHeight + 14);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [faces, videoRef, isMirrored]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
};
