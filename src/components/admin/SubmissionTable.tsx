import { Submission } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';

interface SubmissionTableProps {
  submissions: Submission[];
  onView: (s: Submission) => void;
  onApprove: (id: string) => void;
  onFlag: (id: string) => void;
}

export function SubmissionTable({ submissions, onView, onApprove, onFlag }: SubmissionTableProps) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden min-h-[400px]">
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/50">
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Athlete</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Test</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">AI Reps</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Admin Reps</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Score</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Status</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {submissions.map(s => {
              const aiReps = (s as any).ai_rep_count ?? s.score ?? 0;
              const adminReps = (s as any).admin_rep_count;
              const hasAdminCount = adminReps != null;
              const match = hasAdminCount && adminReps === aiReps;
              const diff = hasAdminCount ? adminReps - aiReps : null;

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {s.profile_photo ? (
                        <img src={s.profile_photo} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-sm shrink-0">
                          {s.name.slice(0, 2)}
                        </div>
                      )}
                      <span className="text-sm font-extrabold text-slate-900 leading-tight">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{s.test}</td>
                  <td className="px-6 py-4 text-sm font-extrabold text-indigo-600">{aiReps}</td>
                  <td className="px-6 py-4">
                    {hasAdminCount ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-extrabold ${match ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {adminReps}
                        </span>
                        {match ? (
                          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">✓</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            {diff! > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-extrabold text-indigo-600">{s.pct}th</td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={s.status === 'approved' ? 'success' : s.status === 'flagged' ? 'destructive' : 'warning'}>
                      {s.status}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 items-center">
                      <button onClick={() => onView(s)} className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all duration-300">View</button>
                      <button onClick={() => onApprove(s.id)} className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all duration-300">Approve</button>
                      <button onClick={() => onFlag(s.id)} className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-all duration-300">Flag</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
