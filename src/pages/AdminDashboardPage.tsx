import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, athletesApi, notificationsApi, supportApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TalentHeatmap } from '@/components/admin/TalentHeatmap';
import { ExportButton } from '@/components/common/ExportButton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, BarChart3, Star, Flag, ChevronRight, MessageSquare, Bell, HelpCircle, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({ totalAthletes: 0, totalTests: 0, elitePerformers: 0, flaggedCount: 0 });
  const [trend, setTrend] = useState<{ month: string; value: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Support state
  const [showSupport, setShowSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [sendingSupport, setSendingSupport] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, notifData] = await Promise.all([
          dashboardApi.admin(),
          notificationsApi.list(),
        ]);
        setStats(dashData.stats);
        setTrend(dashData.trend);
        setRecent(dashData.recentSubmissions);
        setNotifications(notifData.notifications);
      } catch (err) {
        console.error('Admin dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleExportReport = async () => {
    try {
      const { athletes } = await athletesApi.list();
      
      // Define CSV header
      const headers = ['Name', 'Email', 'Age', 'Gender', 'Location', 'Tests Taken', 'Avg Percentile', 'Status'];
      
      // Map data to CSV rows
      const rows = athletes.map(a => [
        `"${a.name}"`,
        `"${a.email || ''}"`,
        a.age || 'N/A',
        a.gender || 'N/A',
        `"${a.location || 'N/A'}"`,
        a.tests || 0,
        `${a.avgPct || 0}%`,
        a.status || 'active'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sai_athlete_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate export. Please try again.');
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingSupport(true);
    try {
      await supportApi.sendMessage(supportForm);
      toast({ title: 'Message Sent', description: 'Your message has been sent to the Head Administrator.' });
      setShowSupport(false);
      setSupportForm({ subject: '', message: '' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingSupport(false);
    }
  };

  const maxVal = Math.max(...trend.map(d => d.value), 1);

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
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Command Center</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowSupport(true)}
                className="px-5 py-2.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all duration-300"
              >
                <HelpCircle className="w-4 h-4" />
                Help
              </button>
            )}
            <button
              onClick={() => nav('/admin/messages')}
              className="px-5 py-2.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all duration-300"
            >
              <MessageSquare className="w-4 h-4" />
              Inbox
            </button>
            <div className="w-[180px]">
              <ExportButton label="Export Report" onExport={handleExportReport} />
            </div>
          </div>
        </div>

        {/* Notifications Feed */}
        {notifications.length > 0 && (
          <div className="mb-10 p-6 bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Command Feed</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
              {notifications.map((n) => (
                <div key={n.id} className="min-w-[320px] bg-slate-50 border border-slate-200/60 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-widest">{n.title}</span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{n.date.split('T')[0]}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">"{n.message}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard title="Total Athletes" value={stats.totalAthletes} icon={<Users className="w-5 h-5" />} trend={12} delay={0} />
          <StatCard title="Tests This Month" value={stats.totalTests} icon={<BarChart3 className="w-5 h-5" />} trend={8} delay={0} />
          <StatCard title="Elite Performers" value={stats.elitePerformers} icon={<Star className="w-5 h-5" />} trend={5} delay={0} />
          <StatCard title="Flagged Videos" value={stats.flaggedCount} icon={<Flag className="w-5 h-5" />} trend={-2} delay={0} />
        </div>

        {/* Chart */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6 tracking-tight">Monthly Submissions Trend</h2>
          <div className="h-48 flex items-end gap-4" role="img" aria-label="Monthly submissions bar chart">
            {trend.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0 duration-300">{d.value}</span>
                <div
                  style={{ height: `${(d.value / maxVal) * 100}%` }}
                  className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl min-h-[4px] shadow-sm group-hover:shadow-[0_0_15px_rgba(79,70,229,0.5)] group-hover:from-indigo-500 group-hover:to-blue-400 transition-all duration-300 relative"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full mt-1 group-hover:text-indigo-600 transition-colors">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="mb-8">
          <TalentHeatmap />
        </div>

        {/* Recent Submissions */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden mt-10">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Submissions</h2>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 cursor-pointer hover:text-indigo-800 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Athlete</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Test</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {recent.map((s) => (
                  <tr 
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{s.name}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">{s.loc}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{s.test}</td>
                    <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{s.score} <span className="text-indigo-600 font-bold ml-1">({s.pct}th)</span></td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={s.status === 'approved' ? 'success' : s.status === 'flagged' ? 'destructive' : 'warning'}>
                        {s.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Support Modal for Admins to contact HeadAdmin */}
      {showSupport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-premium overflow-hidden border border-white/20 scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
              <h3 className="text-xl font-extrabold tracking-tight">Contact Head Administrator</h3>
              <button onClick={() => setShowSupport(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSupportSubmit} className="p-8 space-y-6 bg-slate-50/50">
              <div className="p-4 bg-amber-50/80 border border-amber-100/50 rounded-xl flex gap-3 text-sm font-medium text-amber-900 mb-2">
                <HelpCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <p>Use this form to submit internal requests, feedback, or escalate issues directly to the Head Administrator.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Issue Subject</label>
                <input
                  required
                  type="text"
                  value={supportForm.subject}
                  onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                  placeholder="e.g. Need approval for new test guidelines"
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
                  placeholder="Review the attached records..."
                  className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={sendingSupport}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300"
                >
                  {sendingSupport && <Loader2 className="w-5 h-5 animate-spin" />}
                  {sendingSupport ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
