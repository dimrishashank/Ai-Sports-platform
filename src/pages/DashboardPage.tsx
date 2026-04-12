import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, testsApi, notificationsApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { PerformanceChart } from '@/components/athlete/PerformanceChart';
import { TestHistoryTable } from '@/components/athlete/TestHistoryTable';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CheckCircle, BarChart3, Trophy, Star, ChevronRight, HelpCircle, X, Send, Loader2, Bell } from 'lucide-react';
import { supportApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [stats, setStats] = useState({ testsCompleted: 0, avgPercentile: 0, bestScore: 0, overallRating: 'N/A' });
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSupport, setShowSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, histData, nData] = await Promise.all([
          dashboardApi.athlete(),
          testsApi.getHistory(),
          notificationsApi.list(),
        ]);
        setStats(dashData.stats);
        setTests(histData.tests);
        setNotifications(nData.notifications);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await supportApi.sendMessage(supportForm);
      toast({ title: "Support Request Sent", description: "Admin will review your concern shortly." });
      setSupportForm({ subject: '', message: '' });
      setShowSupport(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const chartData = tests.map(t => ({
    label: t.type,
    value: t.percentile,
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-6 py-8">
          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-72" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />)}
            </div>
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, {user?.name?.split(' ')[0]} 
              </h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Here's your performance overview for today.</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSupport(true)}
                className="px-5 py-2.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all duration-300"
              >
                <HelpCircle className="w-4 h-4" />
                Support
              </button>
              <button
                onClick={() => nav('/record-test')}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
              >
                + Record New Test
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-10 bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Notifications</h2>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{notifications.length}</span>
            </div>
            <div className="space-y-4">
              {(showAllNotifications ? notifications : notifications.slice(0, 4)).map((n) => (
                <div key={n.id} className={`p-5 rounded-xl border ${n.type === 'personal' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">{n.title}</span>
                    <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">{n.date ? new Date(n.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{n.message}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1">
                    From <span className="text-indigo-500">{n.sender || 'System'}</span>
                  </p>
                </div>
              ))}
            </div>
            {notifications.length > 4 && (
              <button
                onClick={() => setShowAllNotifications(!showAllNotifications)}
                className="w-full text-center mt-5 pt-4 border-t border-slate-100 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {showAllNotifications ? 'Show Less' : `View all ${notifications.length} notifications`}
              </button>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard title="Tests Completed" value={stats.testsCompleted} icon={<CheckCircle className="w-5 h-5" />} delay={0} />
          <StatCard title="Avg Percentile" value={`${stats.avgPercentile}%`} icon={<BarChart3 className="w-5 h-5" />} trend={5} delay={0} />
          <StatCard title="Best Score" value={`${stats.bestScore}th`} icon={<Trophy className="w-5 h-5" />} trend={3} delay={0} />
          <StatCard title="Overall Rating" value={stats.overallRating} icon={<Star className="w-5 h-5" />} delay={0} />
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <PerformanceChart data={chartData} title="Performance by Test Type" className="mb-8 p-6 bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]" />
        )}

        {/* History Table */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <TestHistoryTable tests={tests} />
        </div>
      </div>

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-premium overflow-hidden border border-white/20 scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
              <h3 className="text-xl font-extrabold tracking-tight">Contact Support</h3>
              <button onClick={() => setShowSupport(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSupportSubmit} className="p-8 space-y-6 bg-slate-50/50">
              <div className="p-4 bg-indigo-50/80 border border-indigo-100/50 rounded-xl flex gap-3 text-sm font-medium text-indigo-900 mb-2">
                <HelpCircle className="w-5 h-5 shrink-0 text-indigo-500" />
                <p>Your account details (Name, ID) will be automatically shared with the admin for faster resolution.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Issue Subject</label>
                <input
                  required
                  type="text"
                  value={supportForm.subject}
                  onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                  placeholder="e.g. Test validation pending"
                  className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Detail Description</label>
                <textarea
                  required
                  rows={4}
                  value={supportForm.message}
                  onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Please describe your issue or question..."
                  className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300"
                >
                  {sending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
