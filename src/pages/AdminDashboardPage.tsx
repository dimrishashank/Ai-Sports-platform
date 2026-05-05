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
import { motion, AnimatePresence } from 'framer-motion';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

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
        <div className="px-6 py-10 max-w-[1400px] mx-auto">
          <div className="space-y-8">
            <div className="h-12 bg-slate-200/50 rounded-2xl animate-pulse w-96" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-36 bg-slate-200/50 rounded-3xl animate-pulse" />)}
            </div>
            <div className="h-80 bg-slate-200/50 rounded-3xl animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-6 py-10 max-w-[1400px] mx-auto relative">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />
        
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="relative z-10">
          <motion.div variants={fadeUp} className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Command Center</h1>
              <p className="text-slate-500 font-medium text-lg mt-2">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowSupport(true)}
                  className="px-6 py-3.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200/80 rounded-2xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all duration-200"
                >
                  <HelpCircle className="w-5 h-5" />
                  Help
                </button>
              )}
              <button
                onClick={() => nav('/admin/messages')}
                className="px-6 py-3.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200/80 rounded-2xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all duration-200"
              >
                <MessageSquare className="w-5 h-5" />
                Inbox
              </button>
              <div className="w-[180px]">
                <ExportButton label="Export Report" onExport={handleExportReport} />
              </div>
            </div>
          </motion.div>

          {/* Notifications Feed */}
          {notifications.length > 0 && (
            <motion.div variants={fadeUp} className="mb-12 p-8 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 bg-amber-500 h-full" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Command Feed</h2>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-4 scroll-smooth scrollbar-hide">
                {notifications.map((n) => (
                  <div key={n.id} className="min-w-[340px] bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 hover:shadow-md hover:border-slate-300 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">{n.title}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{n.date.split('T')[0]}</span>
                    </div>
                    <p className="text-base font-medium text-slate-700 leading-relaxed">"{n.message}"</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard title="Total Athletes" value={stats.totalAthletes} icon={<Users className="w-6 h-6" />} trend={12} delay={0} />
            <StatCard title="Tests This Month" value={stats.totalTests} icon={<BarChart3 className="w-6 h-6" />} trend={8} delay={0} />
            <StatCard title="Elite Performers" value={stats.elitePerformers} icon={<Star className="w-6 h-6" />} trend={5} delay={0} />
            <StatCard title="Flagged Videos" value={stats.flaggedCount} icon={<Flag className="w-6 h-6" />} trend={-2} delay={0} />
          </motion.div>

          {/* Chart */}
          <motion.div variants={fadeUp} className="bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-premium rounded-[2rem] p-8 mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Monthly Submissions Trend</h2>
            <div className="h-56 flex items-end gap-6" role="img" aria-label="Monthly submissions bar chart">
              {trend.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-3 group cursor-pointer">
                  <span className="text-sm font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0 duration-300">{d.value}</span>
                  <div
                    style={{ height: `${(d.value / maxVal) * 100}%` }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-violet-500 rounded-t-xl min-h-[4px] shadow-sm group-hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] group-hover:from-indigo-500 group-hover:to-violet-400 transition-all duration-300 relative"
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate max-w-full mt-2 group-hover:text-indigo-600 transition-colors">{d.month}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Heatmap */}
          <motion.div variants={fadeUp} className="mb-12">
            <TalentHeatmap />
          </motion.div>

          {/* Recent Submissions */}
          <motion.div variants={fadeUp} className="bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-premium rounded-[2rem] overflow-hidden mt-12">
            <div className="p-8 flex items-center justify-between border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Submissions</h2>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600 cursor-pointer hover:text-indigo-800 flex items-center gap-1 transition-colors group">
                View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100/50 bg-slate-50/30">
                    <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Athlete</th>
                    <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Test</th>
                    <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                    <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {recent.map((s) => (
                    <tr 
                      key={s.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          {s.profile_photo ? (
                            <img src={s.profile_photo} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm uppercase shadow-sm shrink-0 border border-indigo-100">
                              {s.name.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="text-base font-bold text-slate-900 leading-tight">{s.name}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1">{s.loc}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-base font-medium text-slate-700">{s.test}</td>
                      <td className="px-8 py-5 text-base font-extrabold text-slate-900">{s.score} <span className="text-indigo-600 font-bold ml-1">({s.pct}th)</span></td>
                      <td className="px-8 py-5">
                        <StatusBadge variant={s.status === 'approved' ? 'success' : s.status === 'flagged' ? 'destructive' : 'warning'}>
                          {s.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Support Modal for Admins to contact HeadAdmin */}
      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
                <h3 className="text-2xl font-black tracking-tight">Contact Head Administrator</h3>
                <button onClick={() => setShowSupport(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSupportSubmit} className="p-8 space-y-6 bg-slate-50/50">
                <div className="p-5 bg-amber-50/80 border border-amber-100/50 rounded-2xl flex gap-4 text-sm font-medium text-amber-900 mb-2">
                  <HelpCircle className="w-6 h-6 shrink-0 text-amber-500" />
                  <p>Use this form to submit internal requests, feedback, or escalate issues directly to the Head Administrator.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Issue Subject</label>
                  <input
                    required
                    type="text"
                    value={supportForm.subject}
                    onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                    placeholder="e.g. Need approval for new test guidelines"
                    className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Detail Description</label>
                  <textarea
                    required
                    rows={4}
                    value={supportForm.message}
                    onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                    placeholder="Review the attached records..."
                    className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm"
                  />
                </div>
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={sendingSupport}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-premium hover:shadow-premium-hover active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 text-lg"
                  >
                    {sendingSupport && <Loader2 className="w-6 h-6 animate-spin" />}
                    {sendingSupport ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
