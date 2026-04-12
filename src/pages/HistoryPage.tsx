import { useState, useEffect } from 'react';
import { testsApi } from '@/lib/api';
import { TestHistoryTable } from '@/components/athlete/TestHistoryTable';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Activity, Trophy, Search } from 'lucide-react';

export default function HistoryPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    testsApi.getHistory()
      .then(data => setTests(data.tests))
      .catch(err => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredTests = tests.filter(t => 
    t.type.toLowerCase().includes(search.toLowerCase()) || 
    t.date.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Activity className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Performance History</h1>
            </div>
            <p className="text-gray-600 text-sm font-medium">Track your progress and review previous test recordings</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search tests or dates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
            <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Assessments</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-gray-900">{tests.length}</span>
                  <span className="text-xs text-green-600 font-bold mb-1">Records</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Average Percentile</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-blue-600">
                    {tests.length ? Math.round(tests.reduce((acc, t) => acc + t.percentile, 0) / tests.length) : 0}%
                  </span>
                  <span className="text-xs text-gray-400 font-bold mb-1">Global Rank</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Personal Best</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-yellow-600">
                    {tests.length ? Math.max(...tests.map(t => t.percentile)) : 0}th
                  </span>
                  <Trophy className="w-5 h-5 text-yellow-500 mb-1.5" />
                </div>
              </div>
            </div>

            <TestHistoryTable tests={filteredTests} title="Detailed Performance Log" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
