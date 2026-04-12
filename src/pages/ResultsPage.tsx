import { useLocation, useNavigate } from 'react-router-dom';
import { BenchmarkComparison } from '@/components/athlete/BenchmarkComparison';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Trophy, Clock, Target, ChevronRight, RotateCcw } from 'lucide-react';

export default function ResultsPage() {
  const location = useLocation();
  const nav = useNavigate();
  const results = location.state?.results;

  if (!results) {
    return (
      <DashboardLayout>
        <div className="max-w-screen-md mx-auto px-6 py-20 text-center">
          <div className="inline-flex w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">No results found</h1>
          <p className="text-gray-500 mt-2 mb-8">Take a performance test to see your results here.</p>
          <button
            onClick={() => nav('/record-test')}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Start a Test
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const pct = Math.min(95, Math.round(results.score * 1.8 + 10));
  const rating = pct >= 90 ? 'Excellent' : pct >= 75 ? 'Very Good' : pct >= 60 ? 'Good' : 'Average';
  const ratingColor = pct >= 90 ? 'text-green-600' : pct >= 75 ? 'text-blue-600' : pct >= 60 ? 'text-yellow-600' : 'text-gray-500';

  return (
    <DashboardLayout>
      <div className="max-w-screen-md mx-auto px-6 py-8">
        {/* Hero Result Card */}
        <div
          className="bg-white border border-gray-200 rounded-xl p-8 text-center mb-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-blue-50/50 pointer-events-none" />
          
          <div className="inline-flex w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4 relative z-10">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 relative z-10">Test Complete!</h1>
          <p className="text-sm text-gray-500 mt-2 relative z-10">{results.testType} · {new Date().toLocaleDateString()}</p>

          <div className="grid grid-cols-3 gap-6 mt-10 relative z-10">
            <div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Score</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {results.score}
                <span className="text-sm font-medium text-gray-400 ml-1">reps</span>
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Duration</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{results.duration}s</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Rating</p>
              <p className={`text-xl font-bold mt-1 ${ratingColor}`}>{rating}</p>
            </div>
          </div>
        </div>

        {/* Percentile Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">National Percentile Rank</p>
            <span className="text-sm font-bold text-blue-600">{pct}th percentile</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              style={{ width: `${pct}%` }}
              className="h-full bg-blue-600 rounded-full"
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            You performed better than {pct}% of athletes in your age group nationally
          </p>
        </div>

        <BenchmarkComparison testType={results.testType} score={results.score} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm" />

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => nav('/dashboard')}
            className="flex-1 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            Dashboard <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => nav('/record-test')}
            className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Take Another
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
