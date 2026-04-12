import { useState, useEffect } from 'react';
import { submissionsApi } from '@/lib/api';
import { Loader2, AlertCircle, X, CheckCircle, Flag, Hash, Eye } from 'lucide-react';

interface VideoReviewPlayerProps {
  submission: {
    id: string;
    name: string;
    test: string;
    score: number;
    pct: number;
    date: string;
    ai_rep_count?: number;
    admin_rep_count?: number | null;
    verified_rep_count?: number;
  };
  onApprove: (id: string, adminRepCount?: number) => void;
  onFlag: (id: string, adminRepCount?: number) => void;
  onClose: () => void;
}

export function VideoReviewPlayer({ submission, onApprove, onFlag, onClose }: VideoReviewPlayerProps) {
  const [comment, setComment] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminReps, setAdminReps] = useState<string>(
    submission.admin_rep_count != null ? String(submission.admin_rep_count) : ''
  );

  const aiReps = submission.ai_rep_count ?? submission.score ?? 0;
  const parsedAdminReps = adminReps !== '' ? parseInt(adminReps) : undefined;
  const verifiedReps = parsedAdminReps !== undefined ? parsedAdminReps : aiReps;
  const repDiff = parsedAdminReps !== undefined ? parsedAdminReps - aiReps : null;

  useEffect(() => {
    let mounted = true;
    
    setLoading(true);
    submissionsApi.getVideoUrl(submission.id)
      .then(data => {
        if (mounted) {
          setVideoUrl(data.url);
          setError(null);
        }
      })
      .catch(err => {
        if (mounted) {
          console.error('Failed to fetch video URL:', err);
          setError('Could not load video preview');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [submission.id]);

  const isRepBased = !submission.test.toLowerCase().includes('jump') && !submission.test.toLowerCase().includes('vertical');
  const unit = isRepBased ? 'reps' : 'cm';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={onClose} role="dialog" aria-modal="true" aria-label="Video review">
      <div className="bg-white border border-white/20 rounded-3xl max-w-2xl w-full p-8 shadow-premium relative overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reviewing Activity</h2>
            <p className="text-slate-500 text-sm font-semibold mt-0.5">{submission.name} • {submission.date}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all duration-300" aria-label="Close dialog">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden mb-6 border border-slate-200 shadow-sm group" style={{ aspectRatio: '16/9' }}>
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <p className="text-xs font-bold text-white/70 tracking-widest uppercase">Initializing Stream...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm font-semibold text-white/90">{error}</p>
              <p className="text-xs text-white/50">The video might still be processing or was deleted from the storage server.</p>
            </div>
          ) : videoUrl ? (
            <>
              <video 
                src={videoUrl} 
                className="w-full h-full rounded-2xl object-contain bg-slate-900"
                controls
                autoPlay={false}
                playsInline
                preload="metadata"
                title="Performance Review Feed"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-white/70">No video recording available for this submission.</p>
            </div>
          )}
        </div>

        {/* Submission Details */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6 relative z-10 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Athlete</span> 
            <span className="font-extrabold text-slate-900">{submission.name}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Assessment</span> 
            <span className="font-extrabold text-slate-900">{submission.test}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">AI Score</span> 
            <span className="font-extrabold text-indigo-600">{submission.score} {unit}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Percentile</span> 
            <span className="font-extrabold text-slate-900">{submission.pct}th</span>
          </div>
        </div>

        {/* Admin Rep Count Section — only for rep-based exercises */}
        {isRepBased && (
          <div className="mb-6 relative z-10 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">Visual Rep Verification</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 items-end">
              {/* AI Count */}
              <div className="text-center bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">AI Counted</p>
                <p className="text-3xl font-extrabold text-indigo-600">{aiReps}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">reps</p>
              </div>
              
              {/* Admin Input */}
              <div className="text-center">
                <label htmlFor="admin-reps" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Your Count</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input
                    id="admin-reps"
                    type="number"
                    min="0"
                    max="999"
                    value={adminReps}
                    onChange={e => setAdminReps(e.target.value)}
                    placeholder="—"
                    className="w-full pl-9 pr-3 py-3.5 text-center text-2xl font-extrabold text-slate-900 bg-white border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-2">Watch video &amp; count</p>
              </div>

              {/* Comparison */}
              <div className="text-center bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Verified</p>
                <p className={`text-3xl font-extrabold ${repDiff !== null && repDiff !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {verifiedReps}
                </p>
                {repDiff !== null && repDiff !== 0 && (
                  <p className="text-[10px] font-bold text-amber-600 mt-1">
                    {repDiff > 0 ? `+${repDiff}` : repDiff} diff
                  </p>
                )}
                {repDiff === 0 && (
                  <p className="text-[10px] font-bold text-emerald-600 mt-1">✓ Match</p>
                )}
                {repDiff === null && (
                  <p className="text-[10px] text-slate-400 font-bold mt-1">AI default</p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium mt-4 text-center leading-relaxed">
              Your count overrides the AI count and is used as ground truth to improve accuracy.
              Leave blank to accept AI's count.
            </p>
          </div>
        )}

        {/* Manual Comment */}
        <div className="mb-6 relative z-10">
          <label htmlFor="review-comment" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Internal Review Notes</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add observations about form quality, potential fraud, or technical issues..."
            rows={2}
            className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none shadow-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-4 relative z-10">
          <button 
            onClick={() => onApprove(submission.id, parsedAdminReps)} 
            className="flex-1 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5"/> Approve Entry
          </button>
          <button 
            onClick={() => onFlag(submission.id, parsedAdminReps)} 
            className="flex-1 py-3.5 bg-white border border-slate-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Flag className="w-5 h-5"/> Flag for Review
          </button>
        </div>
      </div>
    </div>
  );
}
