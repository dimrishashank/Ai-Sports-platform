import { useState, useEffect } from 'react';
import { demoVideosApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Upload, Trash2, Loader2, Film, CheckCircle, Dumbbell, Activity, Target } from 'lucide-react';

const TEST_TYPES = [
  { key: 'pushups', label: 'Pushups', icon: Dumbbell, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'sit-ups', label: 'Sit-ups', icon: Activity, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'pull-ups', label: 'Pull-ups', icon: Target, color: 'text-green-600 bg-green-50 border-green-200' },
];

export function DemoVideoManager() {
  const [demos, setDemos] = useState<Record<string, { file_id: string; url: string }>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDemos = async () => {
    try {
      const data = await demoVideosApi.getAll();
      setDemos(data.demos);
    } catch { }
  };

  useEffect(() => { loadDemos(); }, []);

  const handleUpload = async (testKey: string, file: File) => {
    setUploading(testKey);
    setProgress(0);
    try {
      await demoVideosApi.upload(testKey, file, (pct) => setProgress(pct));
      toast({ title: 'Demo Video Uploaded', description: `Demo for "${testKey}" saved successfully.` });
      loadDemos();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (testKey: string) => {
    setDeleting(testKey);
    try {
      await demoVideosApi.delete(testKey);
      toast({ title: 'Demo Deleted', description: `Demo for "${testKey}" removed.` });
      loadDemos();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] shadow-premium p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Film className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Demo Videos</h2>
          <p className="text-sm text-slate-500 font-medium">Upload reference videos athletes will see before recording a test.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {TEST_TYPES.map(({ key, label, icon: Icon, color }) => {
          const hasDemo = !!demos[key];
          const isUploading = uploading === key;
          const isDeleting = deleting === key;

          return (
            <div key={key} className={`rounded-2xl border-2 p-6 transition-all ${hasDemo ? 'border-emerald-200 bg-emerald-50/30' : 'border-dashed border-slate-200 bg-slate-50/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{label}</p>
                  {hasDemo ? (
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Video uploaded
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">No demo yet</p>
                  )}
                </div>
              </div>

              {/* Preview */}
              {hasDemo && (
                <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video border border-slate-200">
                  <video
                    src={demos[key].url}
                    controls
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all ${isUploading ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {hasDemo ? 'Replace' : 'Upload'}
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(key, f);
                      e.target.value = '';
                    }}
                  />
                </label>

                {hasDemo && (
                  <button
                    onClick={() => handleDelete(key)}
                    disabled={isDeleting}
                    className="px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
