/**
 * VideoRecorder — Real camera feed with MediaPipe pose detection.
 * Records video via MediaRecorder API, counts reps via joint angle analysis,
 * and submits results + video to Flask backend with a live progress bar.
 *
 * For Vertical Jump: no rep counting — athlete enters height manually after recording.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { CountdownTimer } from './CountdownTimer';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useRepCounter } from '@/hooks/useRepCounter';
import { testsApi } from '@/lib/api';
import { ChevronRight } from 'lucide-react';

interface VideoRecorderProps {
  testType: string;
  onComplete: (result: { testType: string; score: number; duration: number }) => void;
}

export function VideoRecorder({ testType, onComplete }: VideoRecorderProps) {
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'recording' | 'uploading' | 'complete'>('ready');
  const [duration, setDuration] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jumpHeight, setJumpHeight] = useState('');

  const videoElRef = useRef<HTMLVideoElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isVerticalJump = testType.toLowerCase().includes('jump') || testType.toLowerCase().includes('vertical');

  const { repCount, currentPhase, currentAngle, formQuality, angleLabel, processLandmarks, reset } = useRepCounter({ testType });

  const poseDetection = usePoseDetection({
    onLandmarks: processLandmarks,
  });

  // Initialize MediaPipe on mount
  useEffect(() => {
    poseDetection.init();
  }, []);

  // Start camera for preview in ready phase
  useEffect(() => {
    if (phase === 'ready' && videoElRef.current) {
      poseDetection.startCamera(videoElRef.current);
    }
  }, [phase, poseDetection]);

  // Duration timer
  useEffect(() => {
    if (phase !== 'recording') return;
    const iv = setInterval(() => {
      setDuration(d => {
        if (d >= 59) {
          handleStop();
          return 60;
        }
        return d + 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const startRecording = useCallback(async () => {
    setPhase('recording');
    reset();
    setDuration(0);
    chunksRef.current = [];

    if (videoElRef.current && canvasElRef.current) {
      await poseDetection.startDetection(videoElRef.current, canvasElRef.current);

      // Start MediaRecorder if camera stream is available
      const stream = videoElRef.current.srcObject as MediaStream;
      if (stream) {
        try {
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.start(1000); // collect data every second
          recorderRef.current = recorder;
        } catch (err) {
          console.warn('MediaRecorder not available:', err);
        }
      }
    }
  }, [poseDetection, reset]);

  const handleStop = useCallback(async () => {
    poseDetection.stopDetection();

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    // Live recordings are always treated as 1-minute tests
    const finalDuration = 60;

    // For vertical jump, go to a height-entry phase before uploading
    if (isVerticalJump) {
      setPhase('complete'); // We'll show the height entry in the complete phase
      return;
    }

    setPhase('uploading');
    setUploadProgress(0);

    // Build video blob
    const videoBlob = chunksRef.current.length > 0
      ? new Blob(chunksRef.current, { type: 'video/webm' })
      : undefined;

    try {
      await testsApi.submit(
        {
          test_type: testType,
          score: repCount,
          duration: finalDuration,
          video: videoBlob,
        },
        (pct) => setUploadProgress(pct)
      );

      setPhase('complete');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to submit test');
      setPhase('complete');
    }
  }, [testType, repCount, duration, isVerticalJump]);

  // Submit vertical jump result with manual height
  const handleJumpSubmit = useCallback(async () => {
    const height = parseFloat(jumpHeight);
    if (!height || height <= 0) return;

    setPhase('uploading');
    setUploadProgress(0);

    const videoBlob = chunksRef.current.length > 0
      ? new Blob(chunksRef.current, { type: 'video/webm' })
      : undefined;

    try {
      await testsApi.submit(
        {
          test_type: testType,
          score: height,
          duration: duration,
          video: videoBlob,
        },
        (pct) => setUploadProgress(pct)
      );

      setPhase('complete');
      setJumpHeight(''); // Clear so we show the success view
    } catch (err: any) {
      setUploadError(err.message || 'Failed to submit test');
      setPhase('complete');
      setJumpHeight(''); // Clear so we show the error in success view
    }
  }, [testType, jumpHeight, duration]);

  const formColors = {
    good: 'text-green-600',
    fair: 'text-yellow-600',
    poor: 'text-red-600',
  };

  // Determine the effective score for the complete screen
  const displayScore = isVerticalJump ? parseFloat(jumpHeight) || 0 : repCount;
  const scoreUnit = isVerticalJump ? 'cm' : 'reps';

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-100 rounded-xl overflow-hidden shadow-sm" style={{ aspectRatio: '4/3' }} role="region" aria-label="Video recording area">
        {/* Hidden video element for camera feed */}
        <video
          ref={videoElRef}
          className={`absolute inset-0 w-full h-full object-cover ${(phase === 'recording' || phase === 'ready' || phase === 'countdown') ? '' : 'hidden'}`}
          playsInline
          muted
          autoPlay
        />
        {/* Canvas overlay for pose skeleton */}
        <canvas
          ref={canvasElRef}
          className={`absolute inset-0 w-full h-full ${(phase === 'recording' || phase === 'ready' || phase === 'countdown') ? '' : 'hidden'}`}
          style={{ pointerEvents: 'none' }}
        />

        {phase === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-8 border border-gray-200 flex flex-col items-center gap-4 shadow-xl text-center">
              <span className="text-5xl" role="img" aria-label="Camera">📹</span>
              <h3 className="text-xl font-bold text-gray-900">Position Yourself</h3>
              <p className="text-sm text-gray-600 max-w-sm font-medium">
                {isVerticalJump
                  ? 'Stand sideways to the camera near a wall or measuring mark. Your full body and jump height should be visible.'
                  : 'Ensure your full body is visible in frame. AI counting requires clear contrast against the background.'
                }
                {!poseDetection.hasCamera && (
                  <span className="block mt-2 text-yellow-600 font-bold">
                    ⚠️ Camera initialization pending...
                  </span>
                )}
              </p>
              <button
                onClick={() => setPhase('countdown')}
                className="mt-2 px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors flex items-center gap-2 group"
              >
                Start Assessment
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <CountdownTimer seconds={3} onComplete={startRecording} />
        )}

        {phase === 'recording' && (
          <>
            {/* HUD overlay */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded px-4 py-3 border border-gray-200 shadow-sm">
              {isVerticalJump ? (
                <>
                  <p className="text-xs uppercase font-bold text-gray-500">Recording</p>
                  <p className="text-2xl font-extrabold text-green-600" aria-live="polite">🚀 Jump!</p>
                  <p className="text-xs mt-1 text-gray-500 font-medium">{duration}s elapsed</p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase font-bold text-gray-500">Reps</p>
                  <p className="text-4xl font-extrabold text-blue-600" aria-live="polite">{repCount}</p>
                  <p className="text-xs mt-1 text-gray-500 font-medium">{duration}s / 60s</p>
                </>
              )}
            </div>

            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded px-3 py-1.5 border border-gray-200 shadow-sm">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-gray-900">REC</span>
              </div>
              {!isVerticalJump && (
                <>
                  <div className="bg-white/90 backdrop-blur-sm rounded px-3 py-1.5 text-right border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-500">{angleLabel}</p>
                    <p className="text-sm font-bold text-gray-900">{currentAngle}°</p>
                  </div>
                  <div className={`bg-white/90 backdrop-blur-sm rounded px-3 py-1.5 text-xs font-bold border border-gray-200 shadow-sm ${formColors[formQuality]}`}>
                    Form: {formQuality.toUpperCase()}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleStop}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-red-600 text-white font-bold rounded shadow-lg hover:bg-red-700 transition-colors"
              aria-label="Stop recording"
            >
              ⏹ Stop
            </button>
          </>
        )}

        {phase === 'uploading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm p-8">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-bold text-gray-900">Uploading Results...</p>
            <p className="text-sm text-gray-500">{uploadProgress}% complete</p>
            {/* Progress bar */}
            <div className="w-64 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
              />
            </div>
            <p className="text-xs text-gray-400">Please don't close this page</p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
            {/* For vertical jump: show height entry form first */}
            {isVerticalJump && jumpHeight !== '' ? (
              // This state shouldn't happen due to flow, but is a safety fallback
              <>
                <span className="text-5xl">🎉</span>
                <h3 className="text-xl font-bold text-gray-900">Test Complete!</h3>
              </>
            ) : isVerticalJump && !uploadError ? (
              // Show height entry form
              <>
                <span className="text-5xl">🚀</span>
                <h3 className="text-xl font-bold text-gray-900">Enter Your Jump Height</h3>
                <p className="text-sm text-gray-500">Video recorded successfully. Now enter your jump height.</p>
                <div className="w-64 mt-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={jumpHeight}
                    onChange={(e) => setJumpHeight(e.target.value)}
                    placeholder="Height in cm (e.g. 45)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleJumpSubmit}
                  disabled={!jumpHeight || parseFloat(jumpHeight) <= 0}
                  className="mt-2 px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Result →
                </button>
              </>
            ) : (
              // Normal complete view (rep-based tests or after jump submission)
              <>
                <span className="text-5xl">🎉</span>
                <h3 className="text-xl font-bold text-gray-900">Test Complete!</h3>
                <p className="text-4xl font-extrabold text-blue-600">{displayScore}</p>
                <p className="text-sm font-medium text-gray-500">{scoreUnit} in {duration}s</p>
                {uploadError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{uploadError}</p>
                )}
                <button
                  onClick={() => onComplete({ testType, score: displayScore, duration })}
                  className="mt-2 px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors"
                >
                  View Results →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <p className="text-sm font-bold text-gray-900 mb-3">📋 Instructions</p>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside font-medium">
          {isVerticalJump ? (
            <>
              <li>Stand sideways to the camera near a wall or measuring mark</li>
              <li>Crouch and jump as high as you can with maximum effort</li>
              <li>After recording, you'll enter your jump height in centimeters</li>
              <li>Video is uploaded as proof for admin verification</li>
              <li>Tap ⏹ Stop after your best jump</li>
            </>
          ) : (
            <>
              <li><strong>Recording window is 1 minute</strong> — stopping early counts as full test</li>
              <li>Maintain proper form throughout each repetition</li>
              <li>AI counts reps via MediaPipe pose detection (joint angle analysis)</li>
              <li>Keep your full body visible in the camera frame</li>
              <li>Video is uploaded to server for admin verification</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
