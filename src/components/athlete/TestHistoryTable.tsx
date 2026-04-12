import { StatusBadge } from '@/components/StatusBadge';
import { Play, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { testsApi } from '@/lib/api';

interface TestHistoryTableProps {
  tests: any[];
  title?: string;
}

export function TestHistoryTable({ tests, title = 'Recent Tests' }: TestHistoryTableProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const handlePlayVideo = async (id: string) => {
    setPlayingId(id);
    setLoadingVideo(true);
    setVideoUrl(null);
    try {
      const { url } = await testsApi.getTestVideoUrl(id);
      setVideoUrl(url);
    } catch (err) {
      alert('Could not retrieve video playback link');
      setPlayingId(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  const closePlayer = () => {
    setPlayingId(null);
    setVideoUrl(null);
  };
  
  return (
    <div className="bg-transparent overflow-hidden">
      <div className="p-2 flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tests.length} records</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 shadow-sm bg-white/50 backdrop-blur-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/50">
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Test</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Score</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Percentile</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Rating</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">AI Feedback</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Official Status</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Date</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Video</th>
            </tr>
          </thead>
          <tbody>
            {!tests || tests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No performance records found.
                </td>
              </tr>
            ) : (
              tests.map((t) => (
                <tr 
                  key={t.id}
                  className="border-t border-slate-100/50 hover:bg-slate-50 transition-colors group"
                >
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-nowrap">{t.type}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 text-nowrap">
                    {t.score} 
                    <span className="text-xs text-slate-400 ml-1 font-bold">{t.unit || 'reps'}</span>
                  </td>
                  <td className="px-6 py-4 text-nowrap">
                    <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{t.percentile}th</span>
                  </td>
                  <td className="px-6 py-4 text-nowrap">
                    <StatusBadge variant={t.rating === 'Excellent' ? 'success' : t.rating === 'Very Good' ? 'warning' : 'default'}>
                      {t.rating}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-nowrap">
                    {t.ai_verdict ? (
                      <StatusBadge variant={t.ai_verdict === 'pass' ? 'success' : 'destructive'} className="bg-opacity-50">
                        {t.ai_verdict === 'pass' ? '✅ Pass' : '🚩 Flag'}
                      </StatusBadge>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Processing...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-nowrap">
                    <StatusBadge variant={t.status === 'approved' ? 'success' : t.status === 'flagged' ? 'destructive' : 'warning'}>
                      {t.status}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium text-nowrap">{t.date}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handlePlayVideo(t.id)}
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg shadow-sm transition-all duration-300"
                      title="Watch Performance Proof"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Video Modal */}
      {playingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-full max-w-4xl bg-white border border-white/20 rounded-3xl overflow-hidden relative shadow-premium animate-in zoom-in-95 duration-300"
          >
            <button
              onClick={closePlayer}
              className="absolute top-4 right-4 z-10 p-2 bg-black/40 backdrop-blur-md text-white/90 hover:text-white rounded-full transition-colors hover:bg-black/60"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="aspect-video bg-slate-900 flex items-center justify-center">
              {loadingVideo ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                  <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Fetching Stream…</p>
                </div>
              ) : videoUrl ? (
                <iframe
                  src={videoUrl}
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                  title="Athlete Performance Feed"
                />
              ) : (
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs text-center px-8">
                  Video streaming unavailable.<br/>Please ensure the file exists in Google Drive.
                </p>
              )}
            </div>
            
            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Performance Review</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Recorded on Cloud Storage</p>
              </div>
              <button 
                onClick={closePlayer}
                className="px-6 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 duration-300"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
