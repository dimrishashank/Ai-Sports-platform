import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { athletesApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TestHistoryTable } from '@/components/athlete/TestHistoryTable';
import { ChevronLeft, User, Mail, MapPin, Calendar, Award, TrendingUp, ShieldAlert, Check } from 'lucide-react';

export default function AdminAthleteProfilePage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [athlete, setAthlete] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    athletesApi.get(id)
      .then(data => setAthlete(data.athlete))
      .catch(err => console.error('Profile error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    try {
      await athletesApi.updateStatus(id, newStatus);
      setAthlete({ ...athlete, status: newStatus });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-6 py-8 space-y-8">
          <div className="h-10 bg-gray-200 animate-pulse rounded-xl w-48" />
          <div className="h-64 bg-gray-200 animate-pulse rounded-3xl" />
          <div className="grid grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!athlete) return <DashboardLayout><div className="p-8 text-gray-700">Athlete not found</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        {/* Breadcrumb */}
        <button 
          onClick={() => nav('/admin/athletes')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Registry</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="h-32 bg-gray-100" />
              <div className="px-8 pb-8 -mt-12 text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-white mx-auto flex items-center justify-center shadow-lg mb-4 overflow-hidden">
                  <User className="w-12 h-12 text-gray-300" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{athlete.name}</h1>
                <StatusBadge variant={athlete.status === 'active' ? 'success' : 'destructive'} className="mb-6">
                  {athlete.status}
                </StatusBadge>

                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email Address</p>
                      <p className="text-sm font-medium text-gray-900">{athlete.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Location</p>
                      <p className="text-sm font-medium text-gray-900">{athlete.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <Calendar className="w-4 h-4 text-blue-600 mb-1" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Age / Rank</p>
                      <p className="text-sm font-medium text-gray-900">{athlete.age || '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <Award className="w-4 h-4 text-blue-600 mb-1" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gender</p>
                      <p className="text-sm font-medium text-gray-900">{athlete.gender || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
                  {athlete.status === 'active' ? (
                    <button 
                      onClick={() => handleUpdateStatus('flagged')}
                      className="flex-1 py-2 bg-red-50 text-red-600 font-medium rounded hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Block Access
                    </button>
                  ) : (
                    <button 
                       onClick={() => handleUpdateStatus('active')}
                       className="flex-1 py-2 bg-green-50 text-green-600 font-medium rounded hover:bg-green-100 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Unblock
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stats & History */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard title="Total Tests Taken" value={athlete.tests_count} icon={<Award className="w-5 h-5" />} delay={0} />
              <StatCard title="Average Ranking" value={`${athlete.avgPct}%`} icon={<TrendingUp className="w-5 h-5" />} trend={2} delay={0} />
              <StatCard title="Personal Best" value={`${athlete.bestPct}th`} icon={<Check className="w-5 h-5" />} trend={5} delay={0} />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <TestHistoryTable tests={athlete.results || []} title="Complete Test History" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
