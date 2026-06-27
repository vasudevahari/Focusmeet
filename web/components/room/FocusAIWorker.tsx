"use client";

import { useEffect, useRef, useCallback } from "react";
import type { FocusEvent } from "@/types";

interface FocusAIWorkerProps {
  localStream: MediaStream | null;
  onFocusScore: (score: number) => void;
  onFocusEvent: (event: FocusEvent) => void;
  enabled?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TICK_MS = 500; // analysis every 500ms
const LOOK_AWAY_THRESHOLD_MS = 60_000;
const FACE_ABSENT_THRESHOLD_MS = 60_000;
const EYES_CLOSED_THRESHOLD_MS = 30_000;
const EAR_CLOSED_THRESHOLD = 0.18; // Eye Aspect Ratio below this = closed
const YAW_AWAY_DEG = 30;   // horizontal head turn
const PITCH_AWAY_DEG = 25; // vertical head tilt

// MediaPipe FaceMesh landmark indices
const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];
// Nose tip, left ear, right ear, chin, forehead for head pose
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;
const FOREHEAD = 10;

type Landmark = { x: number; y: number; z: number };

function dist(a: Landmark, b: Landmark) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function eyeAspectRatio(pts: Landmark[]): number {
  // EAR = (||p1-p5|| + ||p2-p4||) / (2 * ||p0-p3||)
  const A = dist(pts[1], pts[5]);
  const B = dist(pts[2], pts[4]);
  const C = dist(pts[0], pts[3]);
  return (A + B) / (2 * C + 1e-6);
}

function headPoseAngles(lm: Landmark[]): { yaw: number; pitch: number } {
  const nose = lm[NOSE_TIP];
  const chin = lm[CHIN];
  const leftEar = lm[LEFT_EAR];
  const rightEar = lm[RIGHT_EAR];
  const forehead = lm[FOREHEAD];

  const faceWidth = dist(leftEar, rightEar) + 1e-6;
  const faceHeight = dist(forehead, chin) + 1e-6;

  // Yaw: nose horizontal offset from face midpoint
  const midX = (leftEar.x + rightEar.x) / 2;
  const yaw = ((nose.x - midX) / faceWidth) * 90;

  // Pitch: nose vertical offset from face midpoint
  const midY = (forehead.y + chin.y) / 2;
  const pitch = ((nose.y - midY) / faceHeight) * 90;

  return { yaw, pitch };
}

export default function FocusAIWorker({
  localStream,
  onFocusScore,
  onFocusEvent,
  enabled = true,
}: FocusAIWorkerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceMeshRef = useRef<any>(null);
  const latestLandmarksRef = useRef<Landmark[][] | null>(null);

  // Timers for unfocused conditions
  const lookAwayStartRef = useRef<number | null>(null);
  const faceAbsentStartRef = useRef<number | null>(null);
  const eyesClosedStartRef = useRef<number | null>(null);

  // Debounce event firing
  const lastEventRef = useRef<Record<string, number>>({});

  const fireEvent = useCallback(
    (type: FocusEvent["type"], message: string) => {
      const now = Date.now();
      if (now - (lastEventRef.current[type] ?? 0) < 10_000) return; // debounce 10s
      lastEventRef.current[type] = now;
      onFocusEvent({ type, message, timestamp: now });
    },
    [onFocusEvent]
  );

  useEffect(() => {
    if (!enabled || !localStream) return;

    let destroyed = false;

    async function init() {
      // Dynamic import to avoid SSR issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediapipe = await import("@mediapipe/face_mesh" as any).catch(() => null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tfCore = await import("@tensorflow/tfjs-core" as any).catch(() => null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await import("@tensorflow/tfjs-backend-webgl" as any).catch(() => null);

      if (!mediapipe || !tfCore) throw new Error("deps unavailable");

      await tfCore.setBackend("webgl");
      await tfCore.ready();

      const { FaceMesh } = mediapipe;
      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        if (destroyed) return;
        latestLandmarksRef.current =
          results.multiFaceLandmarks?.length > 0
            ? results.multiFaceLandmarks
            : null;
      });

      await faceMesh.initialize();
      faceMeshRef.current = faceMesh;

      // Attach stream to video
      const video = videoRef.current!;
      video.srcObject = localStream;
      await video.play();

      // Send frames to FaceMesh via requestAnimationFrame
      async function sendFrame() {
        if (destroyed) return;
        if (video.readyState >= 2 && faceMeshRef.current) {
          await faceMeshRef.current.send({ image: video });
        }
        rafRef.current = requestAnimationFrame(sendFrame);
      }
      sendFrame();

      // Analysis tick
      tickRef.current = setInterval(() => {
        if (destroyed) return;
        analyze();
      }, TICK_MS);
    }

    function analyze() {
      const now = Date.now();
      const landmarks = latestLandmarksRef.current;

      if (!landmarks || landmarks.length === 0) {
        // Face absent
        if (!faceAbsentStartRef.current) faceAbsentStartRef.current = now;
        lookAwayStartRef.current = null;
        eyesClosedStartRef.current = null;

        const absent = now - faceAbsentStartRef.current;
        const score = Math.max(0, 100 - (absent / FACE_ABSENT_THRESHOLD_MS) * 60);
        onFocusScore(Math.round(score));

        if (absent >= FACE_ABSENT_THRESHOLD_MS) {
          fireEvent("face_absent", "Face not detected for 60 seconds");
        }
        return;
      }

      faceAbsentStartRef.current = null;
      const lm: Landmark[] = landmarks[0];

      // ── Eye Aspect Ratio ──────────────────────────────────────────────────
      const leftPts = LEFT_EYE.map((i) => lm[i]);
      const rightPts = RIGHT_EYE.map((i) => lm[i]);
      const leftEAR = eyeAspectRatio(leftPts);
      const rightEAR = eyeAspectRatio(rightPts);
      const avgEAR = (leftEAR + rightEAR) / 2;
      const eyesClosed = avgEAR < EAR_CLOSED_THRESHOLD;

      if (eyesClosed) {
        if (!eyesClosedStartRef.current) eyesClosedStartRef.current = now;
        const closedDuration = now - eyesClosedStartRef.current;
        if (closedDuration >= EYES_CLOSED_THRESHOLD_MS) {
          fireEvent("eyes_closed", "Eyes closed for 30 seconds");
        }
      } else {
        eyesClosedStartRef.current = null;
      }

      // ── Head Pose ─────────────────────────────────────────────────────────
      const { yaw, pitch } = headPoseAngles(lm);
      const lookingAway =
        Math.abs(yaw) > YAW_AWAY_DEG || Math.abs(pitch) > PITCH_AWAY_DEG;

      if (lookingAway) {
        if (!lookAwayStartRef.current) lookAwayStartRef.current = now;
        const awayDuration = now - lookAwayStartRef.current;
        if (awayDuration >= LOOK_AWAY_THRESHOLD_MS) {
          fireEvent("looking_away", "Looking away for 60 seconds");
        }
      } else {
        lookAwayStartRef.current = null;
      }

      // ── Composite Focus Score ─────────────────────────────────────────────
      let score = 100;

      // Deduct for looking away
      if (lookingAway) {
        const elapsed = lookAwayStartRef.current
          ? now - lookAwayStartRef.current
          : 0;
        score -= Math.min(50, (elapsed / LOOK_AWAY_THRESHOLD_MS) * 50);
      }

      // Deduct for eyes closed
      if (eyesClosed) {
        const elapsed = eyesClosedStartRef.current
          ? now - eyesClosedStartRef.current
          : 0;
        score -= Math.min(40, (elapsed / EYES_CLOSED_THRESHOLD_MS) * 40);
      }

      // Slight deduction for partially turned head
      const headPenalty = (Math.max(0, Math.abs(yaw) - 10) / YAW_AWAY_DEG) * 15;
      score -= headPenalty;

      score = Math.max(0, Math.min(100, score));
      onFocusScore(Math.round(score));
    }

    init().catch((err) => {
      console.warn("[FocusAI] init failed, falling back to canvas heuristic:", err);
      startFallback();
    });

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      faceMeshRef.current?.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, enabled]);

  // ── Canvas fallback (if MediaPipe fails to load) ──────────────────────────
  function startFallback() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !localStream) return;
    video.srcObject = localStream;
    video.play().catch(() => {});
    const ctx = canvas.getContext("2d")!;
    let prevFrame: ImageData | null = null;

    tickRef.current = setInterval(() => {
      if (video.readyState < 2) return;
      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);
      const frame = ctx.getImageData(0, 0, 160, 120);
      let score = 80;
      if (prevFrame) {
        let diff = 0;
        for (let i = 0; i < frame.data.length; i += 16)
          diff += Math.abs(frame.data[i] - prevFrame.data[i]);
        const n = diff / (frame.data.length / 16);
        if (n > 30) score -= 25;
        else if (n < 1) score -= 40;
        else if (n < 5) score = 90;
      }
      let brightness = 0;
      for (let i = 0; i < frame.data.length; i += 4)
        brightness += 0.299 * frame.data[i] + 0.587 * frame.data[i + 1] + 0.114 * frame.data[i + 2];
      if (brightness / (frame.data.length / 4) < 15) score -= 30;
      prevFrame = frame;
      score = Math.max(0, Math.min(100, score + Math.random() * 6 - 3));
      onFocusScore(Math.round(score));
    }, TICK_MS * 6);
  }

  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} muted playsInline />
      <canvas ref={canvasRef} />
    </div>
  );
}
