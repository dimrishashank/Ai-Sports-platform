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
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
        
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="relative z-10">
          
          {/* Header */}
          <motion.div variants={fadeUp} className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{user?.name?.split(' ')[0]}</span>
                </h1>
                <p className="text-slate-500 font-medium text-lg mt-2">Here's your performance overview for today.</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowSupport(true)}
                  className="px-6 py-3.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200/80 rounded-2xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all duration-200"
                >
                  <HelpCircle className="w-5 h-5" />
                  Support
                </button>
                <button
                  onClick={() => nav('/record-test')}
                  className="px-6 py-3.5 bg-slate-900 text-white font-bold rounded-2xl shadow-premium hover:shadow-premium-hover active:scale-95 transition-all duration-200 flex items-center gap-2"
                >
                  + Record New Test
                </button>
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <motion.div variants={fadeUp} className="mb-12 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] shadow-premium p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-indigo-500 h-full" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h2>
                <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">{notifications.length} new</span>
              </div>
              <div className="space-y-4">
                {(showAllNotifications ? notifications : notifications.slice(0, 3)).map((n) => (
                  <div key={n.id} className={`p-6 rounded-2xl border transition-all hover:shadow-md ${n.type === 'personal' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-slate-900">{n.title}</span>
                      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{n.date ? new Date(n.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}</span>
                    </div>
                    <p className="text-base font-medium text-slate-600">{n.message}</p>
                    <p className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-1.5">
                      From <span className="text-indigo-500 px-2 py-0.5 bg-indigo-50 rounded-full">{n.sender || 'System'}</span>
                    </p>
                  </div>
                ))}
              </div>
              {notifications.length > 3 && (
                <button
                  onClick={() => setShowAllNotifications(!showAllNotifications)}
                  className="w-full text-center mt-6 pt-5 border-t border-slate-100 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {showAllNotifications ? 'Collapse list' : `View all ${notifications.length} notifications`}
                </button>
              )}
            </motion.div>
          )}

          {/* Stats Grid */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard title="Tests Completed" value={stats.testsCompleted} icon={<CheckCircle className="w-6 h-6" />} delay={0} />
            <StatCard title="Avg Percentile" value={`${stats.avgPercentile}%`} icon={<BarChart3 className="w-6 h-6" />} trend={5} delay={0} />
            <StatCard title="Best Score" value={`${stats.bestScore}th`} icon={<Trophy className="w-6 h-6" />} trend={3} delay={0} />
            <StatCard title="Overall Rating" value={stats.overallRating} icon={<Star className="w-6 h-6" />} delay={0} />
          </motion.div>

          {/* Chart */}
          {chartData.length > 0 && (
            <motion.div variants={fadeUp}>
              <PerformanceChart data={chartData} title="Performance by Test Type" className="mb-12 p-8 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] shadow-premium" />
            </motion.div>
          )}

          {/* History Table */}
          <motion.div variants={fadeUp} className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] shadow-premium p-8 overflow-hidden">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Recent Assessments</h2>
            <TestHistoryTable tests={tests} />
          </motion.div>
        </motion.div>
      </div>

      {/* Support Modal */}
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
                <h3 className="text-2xl font-black tracking-tight">Contact Support</h3>
                <button onClick={() => setShowSupport(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSupportSubmit} className="p-8 space-y-6 bg-slate-50/50">
                <div className="p-5 bg-indigo-50/80 border border-indigo-100/50 rounded-2xl flex gap-4 text-sm font-medium text-indigo-900 mb-2">
                  <HelpCircle className="w-6 h-6 shrink-0 text-indigo-500" />
                  <p>Your account details (Name, ID) will be automatically shared with the admin for faster resolution.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Issue Subject</label>
                  <input
                    required
                    type="text"
                    value={supportForm.subject}
                    onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                    placeholder="e.g. Test validation pending"
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
                    placeholder="Please describe your issue or question..."
                    className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm"
                  />
                </div>
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-premium hover:shadow-premium-hover active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 text-lg"
                  >
                    {sending && <Loader2 className="w-6 h-6 animate-spin" />}
                    {sending ? 'Sending...' : 'Send Message'}
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
