/**
 * Rep counter hook using pose landmarks and joint angle state machine.
 * Works with MediaPipe landmarks from usePoseDetection.
 */
import { useState, useRef, useCallback } from 'react';
import { type Point, calculateAngle, getExerciseConfig } from '@/lib/poseUtils';

type Phase = 'up' | 'down';

interface UseRepCounterOptions {
  testType: string;
}

export function useRepCounter({ testType }: UseRepCounterOptions) {
  const [repCount, setRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('up');
  const [currentAngle, setCurrentAngle] = useState(0);
  const [formQuality, setFormQuality] = useState<'good' | 'fair' | 'poor'>('good');

  const phaseRef = useRef<Phase>('up');
  const repRef = useRef(0);
  const config = getExerciseConfig(testType);

  const processLandmarks = useCallback((landmarks: Point[]) => {
    if (!landmarks || landmarks.length < 29) return;

    const getAngle = (joints: readonly number[]) => {
      const [jA, jB, jC] = joints;
      const a = landmarks[jA];
      const b = landmarks[jB];
      const c = landmarks[jC];
      if (!a || !b || !c) return { angle: 0, vis: 0 };
      const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1);
      if (vis < 0.3) return { angle: 0, vis: 0 };
      return { angle: calculateAngle(a, b, c), vis };
    };

    const left = getAngle((config as any).leftJoints || config.joints);
    const right = getAngle((config as any).rightJoints || config.joints);

    let finalAngle = 0;
    let minVis = 0;

    if (left.vis > 0.3 && right.vis > 0.3) {
      finalAngle = (left.angle + right.angle) / 2;
      minVis = Math.min(left.vis, right.vis);
    } else if (left.vis > 0.3) {
      finalAngle = left.angle;
      minVis = left.vis;
    } else if (right.vis > 0.3) {
      finalAngle = right.angle;
      minVis = right.vis;
    } else {
      setFormQuality('poor');
      return;
    }

    const angle = finalAngle;
    setCurrentAngle(Math.round(angle));

    // Form quality based on visibility
    setFormQuality(minVis > 0.7 ? 'good' : 'fair');

    // State machine: up → down → up = 1 rep
    if (phaseRef.current === 'up' && angle < config.downThreshold) {
      phaseRef.current = 'down';
      setCurrentPhase('down');
    } else if (phaseRef.current === 'down' && angle > config.upThreshold) {
      phaseRef.current = 'up';
      setCurrentPhase('up');
      repRef.current += 1;
      setRepCount(repRef.current);
    }
  }, [config]);

  const reset = useCallback(() => {
    setRepCount(0);
    setCurrentPhase('up');
    setCurrentAngle(0);
    setFormQuality('good');
    phaseRef.current = 'up';
    repRef.current = 0;
  }, []);

  return {
    repCount,
    currentPhase,
    currentAngle,
    formQuality,
    angleLabel: config.label,
    processLandmarks,
    reset,
  };
}
