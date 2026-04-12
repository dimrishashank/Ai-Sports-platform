import { useState, useEffect } from 'react';
import { leaderboardApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Trophy, Filter, Medal, MapPin, Users } from 'lucide-react';

const AGE_GROUPS = ['all', '10-14', '14-17', '17-19', '19-21', '21+'];
const AGE_LABELS: Record<string, string> = {
  'all': 'All Ages',
  '10-14': '10 – 14 yrs',
  '14-17': '14 – 17 yrs',
  '17-19': '17 – 19 yrs',
  '19-21': '19 – 21 yrs',
  '21+': '21+ yrs',
};

export default function LeaderboardPage() {
  const [gender, setGender] = useState('all');
  const [age, setAge] = useState('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaderboardApi.get({
      gender: gender !== 'all' ? gender : undefined,
      age_group: age !== 'all' ? age : undefined,
    })
      .then(res => setData(res.leaderboard))
      .catch(err => console.error('Leaderboard error:', err))
      .finally(() => setLoading(false));
  }, [gender, age]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">National Leaderboard</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Top performers ranked by composite score across India</p>
        </div>

        {/* Filters */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 flex flex-wrap gap-5 items-end mb-8">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Age Group</label>
            <select
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer"
            >
              {AGE_GROUPS.map(g => (
                <option key={g} value={g}>{AGE_LABELS[g]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 ml-auto bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">{data.length} athletes</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="p-16 text-center">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-500">No athletes found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/50">
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rank</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Athlete</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age Group</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gender</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Percentile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {data.map((a, i) => {
                    const isMedal = i < 3;
                    const medalBg = i === 0 ? 'bg-amber-50/60' : i === 1 ? 'bg-slate-50/60' : i === 2 ? 'bg-orange-50/60' : '';

                    return (
                      <tr key={a.rank} className={`hover:bg-slate-50 transition-colors ${medalBg}`}>
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">
                          {isMedal ? (
                            <span className="text-xl">{medals[i]}</span>
                          ) : (
                            <span className="text-slate-500 font-bold">{a.rank}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">
                          <div className="flex items-center gap-3">
                            {a.profile_photo ? (
                              <img src={a.profile_photo} alt={a.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-sm shrink-0">
                                {a.name.slice(0, 2)}
                              </div>
                            )}
                            {a.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            {a.age_group || `${a.age} yrs`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{a.gender}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">{a.location || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{a.score}</td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-extrabold ${
                            a.percentile >= 90 ? 'text-emerald-600' :
                            a.percentile >= 75 ? 'text-indigo-600' :
                            a.percentile >= 60 ? 'text-amber-600' :
                            'text-slate-500'
                          }`}>
                            {a.percentile}th
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
