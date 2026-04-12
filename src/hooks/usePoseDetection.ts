/**
 * Custom hook for MediaPipe Pose detection using camera feed.
 * Uses @mediapipe/tasks-vision PoseLandmarker (free, runs in browser via WASM).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { type Point, drawSkeleton } from '@/lib/poseUtils';

// Dynamically import to avoid SSR issues
let PoseLandmarker: any = null;
let FilesetResolver: any = null;
let DrawingUtils: any = null;

async function loadMediaPipe() {
  if (PoseLandmarker) return;
  try {
    const vision = await import('@mediapipe/tasks-vision');
    PoseLandmarker = vision.PoseLandmarker;
    FilesetResolver = vision.FilesetResolver;
    DrawingUtils = vision.DrawingUtils;
  } catch (e) {
    console.warn('MediaPipe tasks-vision not available, falling back to simulated mode');
  }
}

interface UsePoseDetectionOptions {
  onLandmarks?: (landmarks: Point[]) => void;
}

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [landmarks, setLandmarks] = useState<Point[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize MediaPipe PoseLandmarker
  const init = useCallback(async () => {
    await loadMediaPipe();
    if (!PoseLandmarker || !FilesetResolver) {
      console.warn('MediaPipe not loaded');
      setIsReady(true); // Still allow usage in simulated mode
      return;
    }

    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      landmarkerRef.current = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      setIsReady(true);
    } catch (err) {
      console.error('MediaPipe init error:', err);
      setIsReady(true); // fallback
    }
  }, []);

  // Start camera separately to allow for preview
  const startCamera = useCallback(async (video: HTMLVideoElement) => {
    videoRef.current = video;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      setHasCamera(true);
      return stream;
    } catch (err: any) {
      console.error('Camera error:', err);
      setHasCamera(false);
      return null;
    }
  }, []);

  // Start camera and detection
  const startDetection = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    videoRef.current = video;
    canvasRef.current = canvas;

    if (!streamRef.current) {
        const stream = await startCamera(video);
        if (!stream) return;
    }

    setIsDetecting(true);

    // Start detection loop
    const detect = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      canvasRef.current.width = video.videoWidth || 640;
      canvasRef.current.height = video.videoHeight || 480;

      if (landmarkerRef.current && video.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());

        if (results?.landmarks?.[0]) {
          const lms: Point[] = results.landmarks[0].map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));
          setLandmarks(lms);
          options.onLandmarks?.(lms);

          // Draw skeleton overlay
          drawSkeleton(ctx, lms, canvasRef.current!.width, canvasRef.current!.height);
        }
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
  }, [options.onLandmarks, startCamera]);

  // Stop detection and camera
  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopDetection();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, [stopDetection]);

  return {
    init,
    isReady,
    isDetecting,
    hasCamera,
    landmarks,
    startCamera,
    startDetection,
    stopDetection,
  };
}
