/**
 * VideoUploader — Upload a pre-recorded video file for a test.
 * 
 * Features:
 * - Drag-and-drop or browse file picker
 * - Live upload progress bar
 * - AI analysis result display
 * - For Vertical Jump: includes height input
 */
import { useState, useRef, useCallback } from 'react';
import { testsApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Upload, FileVideo, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';

interface VideoUploaderProps {
  testType: string;
  onComplete: (result: { testType: string; score: number; duration: number }) => void;
}

export function VideoUploader({ testType, onComplete }: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a video file (.mp4, .webm, .mov)', variant: 'destructive' });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPhase('idle');
    setProgress(0);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 100MB.', variant: 'destructive' });
      return;
    }

    // Check video duration (minimum 60 seconds)
    try {
      const duration = await getVideoDuration(file);
      if (duration < 60) {
        toast({
          title: 'Video too short',
          description: `Video must be at least 1 minute long. Your video is ${Math.round(duration)} seconds.`,
          variant: 'destructive',
        });
        return;
      }
    } catch {
      // If we can't check duration, let the backend handle it
      console.warn('Could not check video duration client-side');
    }

    setPhase('uploading');
    setProgress(0);
    setError('');

    try {
      const res = await testsApi.upload(
        {
          test_type: testType,
          video: file,
        },
        (pct) => {
          setProgress(pct);
          if (pct >= 100) {
            setPhase('analyzing');
          }
        }
      );

      setResult(res.result);
      setPhase('complete');
      toast({
        title: 'Video Uploaded Successfully! ✅',
        description: `Your ${testType} video has been received.`,
      });
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPhase('error');
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /** Get video duration in seconds using HTMLVideoElement */
  const getVideoDuration = (videoFile: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error('Cannot read video'));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      {phase === 'idle' && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/mov"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileVideo className="w-12 h-12 text-green-500" />
                <div>
                  <p className="font-bold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="font-bold text-gray-700">Drag & drop your video here</p>
                  <p className="text-sm text-gray-500">or click to browse files</p>
                </div>
                <p className="text-xs text-gray-400">Supported: MP4, WebM, MOV • Max 100MB</p>
              </div>
            )}
          </div>


          {/* Upload Button */}
          {file && (
            <button
              onClick={handleUpload}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload & Analyze Video
            </button>
          )}
        </>
      )}

      {/* Uploading State with Progress Bar */}
      {phase === 'uploading' && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900 mb-2">Uploading Video...</p>
          <p className="text-sm text-gray-500 mb-4">{progress}% complete</p>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
            />
          </div>
          <p className="text-xs text-gray-400 mt-3">Please don't close this page</p>
        </div>
      )}

      {/* Analyzing State */}
      {phase === 'analyzing' && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900 mb-2">AI is Analyzing Your Video...</p>
          <p className="text-sm text-gray-500">Counting reps and checking form quality</p>
        </div>
      )}

      {/* Complete State */}
      {phase === 'complete' && result && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Complete!</h3>

          {/* Score */}
          <div className="my-6">
            <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Score</p>
            <p className="text-4xl font-extrabold text-blue-600">
              {result.score} <span className="text-lg font-medium text-gray-500">reps</span>
            </p>
          </div>

          {/* AI Verdict */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            result.ai_verdict === 'pass'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {result.ai_verdict === 'pass' ? (
              <><CheckCircle className="w-4 h-4" /> AI Approved</>
            ) : (
              <><AlertTriangle className="w-4 h-4" /> Under Admin Review</>
            )}
          </div>

          {result.ai_confidence > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              AI Confidence: {Math.round(result.ai_confidence * 100)}%
            </p>
          )}

          <button
            onClick={() => onComplete({ testType, score: result.score, duration: 0 })}
            className="mt-6 w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Results →
          </button>
        </div>
      )}

      {/* Error State */}
      {phase === 'error' && (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Failed</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={removeFile}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Info Box */}
      {phase === 'idle' && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <p className="text-sm font-bold text-gray-900 mb-3">📋 Upload Guidelines</p>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li className="font-medium"><strong>Video must be at least 1 minute long</strong></li>
            <li>Record yourself doing {testType.toLowerCase()} from a side angle</li>
            <li>Keep your full body visible in the frame</li>
            <li>AI will automatically count your reps from the video</li>
            <li>Good lighting and clear background helps AI accuracy</li>
          </ul>
        </div>
      )}
    </div>
  );
}
