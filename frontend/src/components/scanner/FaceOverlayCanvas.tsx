import React, { useEffect, useRef } from 'react';
import { DetectedFace, EmotionLabel, EMOTION_EMOJIS } from '../../types';

interface FaceOverlayCanvasProps {
  faces: DetectedFace[];
  videoRef: React.RefObject<HTMLVideoElement>;
  isMirrored?: boolean;
}

const EMOTION_COLORS: Record<EmotionLabel | string, { border: string; text: string }> = {
  Happy: { border: '#10B981', text: '#10B981' },
  Surprised: { border: '#F59E0B', text: '#F59E0B' },
  Sad: { border: '#0284C7', text: '#0284C7' },
  Angry: { border: '#F43F5E', text: '#F43F5E' },
  Fearful: { border: '#8B5CF6', text: '#8B5CF6' },
  Disgusted: { border: '#EA580C', text: '#EA580C' },
  Neutral: { border: '#64748B', text: '#94A3B8' },
  Uncertain: { border: '#EAB308', text: '#EAB308' },
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

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      ctx.clearRect(0, 0, displayW, displayH);

      const videoW = video.videoWidth || displayW;
      const videoH = video.videoHeight || displayH;

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

        // Precise coordinates projected through object-cover scale & offset
        let boxX = offsetX + (bounding_box.x * renderedW);
        const boxY = offsetY + (bounding_box.y * renderedH);
        const boxW = bounding_box.width * renderedW;
        const boxH = bounding_box.height * renderedH;

        // If mirrored (front-facing camera), flip horizontal coordinate
        if (isMirrored) {
          boxX = displayW - (boxX + boxW);
        }

        // ---------------- ONLY TRACKING BORDER (NO FILL) ----------------
        ctx.strokeStyle = colorSet.border;
        ctx.lineWidth = 2.0;

        // Subtle glow effect on border
        ctx.shadowColor = colorSet.border;
        ctx.shadowBlur = 8;

        // Draw only perimeter outline (completely transparent inside)
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Reset shadow
        ctx.shadowBlur = 0;

        // Stylized corner brackets for tech tracking HUD look
        const cornerLen = Math.min(22, boxW * 0.22, boxH * 0.22);
        ctx.lineWidth = 4;
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
        const headerY = Math.max(10, boxY - 34);
        const idLabel = participant_code || session_tracking_id;
        const confPercent = Math.round(confidence * 100);
        const tagText = `${emoji} ${expression} ${confPercent}%  •  ${idLabel}`;

        ctx.font = '600 13px "Segoe UI Emoji", "Apple Color Emoji", Inter, sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const tagPadding = 10;
        const tagHeight = 28;

        // Tag background (solid dark pill above box, never over the face)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = colorSet.border;
        ctx.lineWidth = 1.5;

        const tagX = Math.max(4, Math.min(boxX, displayW - textWidth - tagPadding * 2 - 8));

        // Draw tag pill
        ctx.beginPath();
        ctx.roundRect(tagX, headerY, textWidth + tagPadding * 2, tagHeight, 7);
        ctx.fill();
        ctx.stroke();

        // Tag Text with Emoji
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tagText, tagX + tagPadding, headerY + 19);

        // Secondary participant name if registered
        if (display_name) {
          ctx.font = '500 11px Inter, sans-serif';
          ctx.fillStyle = '#38BDF8';
          ctx.fillText(`Authorized: ${display_name}`, tagX + tagPadding, headerY + tagHeight + 14);
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
