import { useState, useEffect } from 'react';
import { trainingApi, testsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExportButton } from '@/components/common/ExportButton';
import { toast } from '@/components/ui/use-toast';
import {
  Brain, Upload, CheckCircle, AlertTriangle, Loader2,
  Dumbbell, Activity, Target, FileVideo, BarChart3, Hash,
  Trash2, Pencil, X, Play, Save, Eye
} from 'lucide-react';

const TEST_ICONS: Record<string, React.ElementType> = {
  'Pushups': Dumbbell,
  'Sit-ups': Activity,
  'Pull-ups': Target,
};

const TEST_COLORS: Record<string, string> = {
  'Pushups': 'border-blue-500 text-blue-600 bg-blue-50',
  'Sit-ups': 'border-orange-500 text-orange-600 bg-orange-50',
  'Pull-ups': 'border-green-500 text-green-600 bg-green-50',
};

interface TrainingStatus {
  test_type: string;
  correct_samples: number;
  foul_samples: number;
  total_samples: number;
  has_reference: boolean;
  last_trained: string | null;
}

interface TrainingSample {
  id: string;
  test_type: string;
  label: string;
  video_name: string;
  ai_rep_count: number;
  expected_reps: number | null;
  verified_rep_count: number;
  gdrive_file_id: string;
  frames_analyzed: number;
  visibility: number;
  created_at: string;
}

export default function AdminTrainingPage() {
  const { user } = useAuth();
  const isHeadAdmin = user?.role === 'headadmin';
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [trainingData, setTrainingData] = useState<TrainingStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedTest, setSelectedTest] = useState('');
  const [label, setLabel] = useState<'correct' | 'foul'>('correct');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [expectedReps, setExpectedReps] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Samples state
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReps, setEditReps] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Video preview modal
  const [videoModal, setVideoModal] = useState<{ url: string; name: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadSamples(selectedTest);
    }
  }, [selectedTest]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, statusRes] = await Promise.all([
        testsApi.getTypes(),
        trainingApi.getStatus(),
      ]);
      const active = typesRes.types.filter((t: any) => t.status !== 'coming_soon');
      setTestTypes(active);
      setTrainingData(statusRes.training);
      if (active.length > 0 && !selectedTest) {
        setSelectedTest(active[0].name);
      }
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSamples = async (testType: string) => {
    setSamplesLoading(true);
    try {
      const res = await trainingApi.getSamples(testType);
      setSamples(res.samples);
    } catch (err) {
      console.error('Failed to load samples:', err);
    } finally {
      setSamplesLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !selectedTest) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const parsedReps = expectedReps !== '' ? parseInt(expectedReps) : undefined;
      const res = await trainingApi.upload(
        { test_type: selectedTest, label, video: videoFile, expected_reps: parsedReps },
        (pct) => setUploadProgress(pct)
      );
      const repInfo = res.result.expected_reps != null 
        ? `AI: ${res.result.reps_detected} reps, Expected: ${res.result.expected_reps} (diff: ${res.result.rep_difference})`
        : `${res.result.reps_detected} reps detected`;
      toast({
        title: 'Training Video Processed',
        description: `${repInfo}. ${res.result.frames_analyzed} frames analyzed. Visibility: ${res.result.visibility}%`,
      });
      setVideoFile(null);
      setExpectedReps('');
      const fileInput = document.getElementById('training-video-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadData();
      loadSamples(selectedTest);
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err.message || 'Could not process training video.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSample = async (id: string) => {
    setDeletingId(id);
    try {
      await trainingApi.deleteSample(id);
      toast({ title: 'Deleted', description: 'Training sample removed.' });
      loadData();
      loadSamples(selectedTest);
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateReps = async (id: string) => {
    const reps = parseInt(editReps);
    if (isNaN(reps) || reps < 0) {
      toast({ title: 'Invalid', description: 'Enter a valid number.', variant: 'destructive' });
      return;
    }
    try {
      await trainingApi.updateSample(id, { expected_reps: reps });
      toast({ title: 'Updated', description: `Expected reps changed to ${reps}.` });
      setEditingId(null);
      loadSamples(selectedTest);
      loadData();
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handlePlayVideo = async (sample: TrainingSample) => {
    if (!sample.gdrive_file_id) {
      toast({ title: 'No Video', description: 'This sample has no video stored.', variant: 'destructive' });
      return;
    }
    setVideoLoading(true);
    try {
      const res = await trainingApi.getSampleVideoUrl(sample.id);
      setVideoModal({ url: res.url, name: sample.video_name });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVideoLoading(false);
    }
  };

  const handleExportDataset = async () => {
    try {
      const { dataset } = await trainingApi.exportDataset();

      if (!dataset || dataset.length === 0) {
        toast({ title: 'No Data', description: 'No training data available yet to export.', variant: 'destructive' });
        return;
      }

      const headers = [
        'ID', 'Source', 'Test Type', 'Label', 'Video Name',
        'AI Rep Count', 'Admin Rep Count', 'Verified Rep Count',
        'Frames Analyzed', 'FPS',
        'Primary Angle Min', 'Primary Angle Max', 'Primary Angle Mean', 'Primary Angle Std', 'Primary Angle Range',
        'Body Line Mean', 'Body Line Std',
        'Visibility Mean', 'Visibility Min',
        'Rep Duration Mean (s)', 'Rep Duration Std (s)',
        'Created At'
      ];

      const rows = dataset.map(d => [
        d.id, d.source || 'training_upload', `"${d.test_type}"`, d.label, `"${d.video_name || ''}"`,
        d.ai_rep_count ?? d.rep_count ?? 0, d.admin_rep_count ?? '', d.verified_rep_count ?? d.ai_rep_count ?? d.rep_count ?? 0,
        d.analyzed_frames, d.fps,
        d.primary_angle_min, d.primary_angle_max, d.primary_angle_mean, d.primary_angle_std, d.primary_angle_range,
        d.body_line_mean, d.body_line_std, d.visibility_mean, d.visibility_min,
        d.rep_duration_mean, d.rep_duration_std, `"${d.created_at}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sai_training_dataset_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'Dataset Exported', description: `${dataset.length} training records exported successfully.` });
    } catch (error) {
      console.error('Dataset export failed:', error);
      toast({ title: 'Export Failed', description: 'Could not export training dataset.', variant: 'destructive' });
    }
  };

  const getStatus = (testType: string): TrainingStatus | undefined => {
    return trainingData.find(t => t.test_type === testType);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-6 py-8">
          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-72" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8 text-fuchsia-600" />
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Model Training</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">
              Upload labeled exercise videos to train the AI model. The more samples you provide, the more accurate automated verification becomes.
            </p>
          </div>
          {isHeadAdmin && (
            <div className="w-[220px] shrink-0">
              <ExportButton label="Export Dataset" onExport={handleExportDataset} />
            </div>
          )}
        </div>

        {/* Training Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {testTypes.map((t) => {
            const status = getStatus(t.name);
            const Icon = TEST_ICONS[t.name] || Target;
            const colors = TEST_COLORS[t.name] || 'border-slate-400 text-slate-600 bg-slate-50';
            const total = status?.total_samples || 0;

            return (
              <div
                key={t.name}
                onClick={() => setSelectedTest(t.name)}
                className={`bg-white/60 backdrop-blur-md rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  selectedTest === t.name 
                    ? 'border-2 border-fuchsia-500 shadow-premium' 
                    : 'border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-premium-hover hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1 line-clamp-1">{t.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center transition-colors">
                    <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{status?.correct_samples || 0}</p>
                    <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Correct</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-center transition-colors">
                    <p className="text-3xl font-extrabold text-rose-600 tracking-tight">{status?.foul_samples || 0}</p>
                    <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-widest mt-1">Foul</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {status?.has_reference ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {status?.has_reference ? 'Ref Model Active' : 'Needs Correct Sample'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{total} total</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload Section */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden mb-8">
          <div className="px-8 py-6 border-b border-white/40 bg-white/40 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-100 flex items-center justify-center">
              <FileVideo className="w-5 h-5 text-fuchsia-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Upload Training Video</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Selected test: <span className="text-fuchsia-600">{selectedTest || 'None'}</span></p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="p-8 space-y-8">
            {/* Test Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Test Type</label>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="w-full px-4 py-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none appearance-none transition-all shadow-sm cursor-pointer"
              >
                {testTypes.map((t) => (
                  <option key={t.name} value={t.name}>{t.name} — {t.description}</option>
                ))}
              </select>
            </div>

            {/* Label Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Video Label</label>
              <div className="grid grid-cols-2 gap-5">
                <button
                  type="button"
                  onClick={() => setLabel('correct')}
                  className={`p-6 border-2 rounded-2xl text-center transition-all duration-300 ${
                    label === 'correct'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <CheckCircle className={`w-10 h-10 mx-auto mb-3 ${label === 'correct' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <p className="font-extrabold text-slate-900">Correct Form</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Gold standard technique</p>
                </button>
                <button
                  type="button"
                  onClick={() => setLabel('foul')}
                  className={`p-6 border-2 rounded-2xl text-center transition-all duration-300 ${
                    label === 'foul'
                      ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/30'
                  }`}
                >
                  <AlertTriangle className={`w-10 h-10 mx-auto mb-3 ${label === 'foul' ? 'text-rose-500' : 'text-slate-400'}`} />
                  <p className="font-extrabold text-slate-900">Foul / Bad Form</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Incorrect technique</p>
                </button>
              </div>
            </div>

            {/* Video File */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Video File</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-fuchsia-400 bg-slate-50/50 transition-colors cursor-pointer relative">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <input
                  id="training-video-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="pointer-events-none">
                  {videoFile ? (
                    <p className="text-sm font-bold text-fuchsia-600">
                      {videoFile.name} <span className="text-slate-400 font-medium ml-1">({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-900 mb-1">Click to browse or drag and drop</p>
                      <p className="text-xs text-slate-500 font-medium">MP4, WebM up to 50MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expected Rep Count */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Expected Rep Count <span className="text-slate-400 font-medium normal-case">(optional)</span></label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={expectedReps}
                  onChange={(e) => setExpectedReps(e.target.value)}
                  placeholder="e.g. 15 — How many reps are in this video?"
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none transition-all shadow-sm placeholder:text-slate-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">Tell the AI how many reps are in this video. AI will compare its count and learn from the difference.</p>
            </div>

            {/* Progress */}
            {uploading && (
              <div className="space-y-3 bg-fuchsia-50 p-6 rounded-2xl border border-fuchsia-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-fuchsia-900 uppercase tracking-widest text-[10px]">Processing Video Pipeline</span>
                  <span className="font-extrabold text-fuchsia-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-fuchsia-100/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={uploading || !videoFile || !selectedTest}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Video Patterns...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Upload &amp; Train Model
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Training Samples Table */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden mb-8">
          <div className="px-8 py-6 border-b border-white/40 bg-white/40 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Training Samples</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Showing: <span className="text-indigo-600">{selectedTest}</span> — {samples.length} sample{samples.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {samplesLoading ? (
            <div className="p-8 space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-slate-100/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : samples.length === 0 ? (
            <div className="py-16 text-center">
              <FileVideo className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-500">No training samples for {selectedTest} yet.</p>
              <p className="text-xs text-slate-400 mt-1">Upload a video above to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Video</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Label</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Reps</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expected Reps</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visibility</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {samples.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {s.gdrive_file_id ? (
                            <button
                              onClick={() => handlePlayVideo(s)}
                              className="w-10 h-10 rounded-xl bg-fuchsia-100 hover:bg-fuchsia-200 flex items-center justify-center transition-colors shrink-0"
                              title="Play video"
                            >
                              <Play className="w-4 h-4 text-fuchsia-600 ml-0.5" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <FileVideo className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <span className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{s.video_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                          s.label === 'correct' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-indigo-600">{s.ai_rep_count}</td>
                      <td className="px-6 py-4">
                        {editingId === s.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={editReps}
                              onChange={e => setEditReps(e.target.value)}
                              className="w-20 px-3 py-1.5 text-sm font-bold text-slate-900 bg-white border border-fuchsia-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500/20 outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateReps(s.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {s.expected_reps != null ? s.expected_reps : <span className="text-slate-300 font-medium">—</span>}
                            </span>
                            <button
                              onClick={() => { setEditingId(s.id); setEditReps(String(s.expected_reps ?? '')); }}
                              className="p-1 text-slate-400 hover:text-fuchsia-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit expected reps"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${s.visibility}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{s.visibility}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteSample(s.id)}
                          disabled={deletingId === s.id}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                          title="Delete sample"
                        >
                          {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-6 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-sm text-indigo-900 mt-0.5">
              <p className="font-extrabold mb-2 text-lg">How Training Works</p>
              <ul className="space-y-2 font-medium text-indigo-800/80">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Upload videos labeled as <strong>Correct Form</strong> or <strong>Foul</strong></li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> AI extracts joint angles, rep timing, and body alignment from each video</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> After ≥1 correct sample, a reference model is built for that exercise</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Rep counting: UP → DOWN → UP = 1 rep (athlete must start in UP position)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> More samples = better accuracy for automatic approval/flagging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Play className="w-5 h-5 text-fuchsia-600" />
                <h3 className="text-lg font-bold text-slate-900 truncate">{videoModal.name}</h3>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black aspect-video">
              <video
                src={videoModal.url}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Video Loading Overlay */}
      {videoLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex items-center gap-4 shadow-xl">
            <Loader2 className="w-6 h-6 animate-spin text-fuchsia-600" />
            <span className="text-sm font-bold text-slate-700">Loading video...</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
