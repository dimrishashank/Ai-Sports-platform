import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi } from '@/lib/api';
import { Zap, Send, Bell, History, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export function AdminBroadcastPage() {
  const { user } = useAuth();
  const isHead = user?.role === 'headadmin';
  
  const [form, setForm] = useState({ title: '', message: '', target: 'athletes' });
  const [sending, setSending] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  const loadNotifs = async () => {
    try {
      const data = await notificationsApi.list();
      setNotifs(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      if (isHead) {
        await notificationsApi.broadcast(form);
      } else {
        await notificationsApi.send({ title: form.title, message: form.message });
      }
      toast({ title: "Broadcast Sent", description: `Message delivered to ${isHead ? form.target : 'athletes'}` });
      setForm({ title: '', message: '', target: 'athletes' });
      loadNotifs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded bg-blue-100 border border-blue-200">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Broadcast Center
            </h1>
          </div>
          <p className="text-gray-500 font-medium mt-1">Send notifications to athletes and admins.</p>
        </header>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Composition Panel */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" /> Compose Notification
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Schedule Update"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                {isHead && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Send To</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['athletes', 'admins', 'all'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm({ ...form, target: t })}
                          className={`py-2 rounded border text-xs font-bold uppercase transition-all ${
                            form.target === t 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <button
                  disabled={sending}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {sending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </form>
            </div>
          </div>

          {/* History Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 h-full">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" /> Recent Broadcasts
              </h2>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading...</p>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="text-center py-20">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">No broadcasts yet</p>
                  </div>
                ) : (
                  notifs.filter(n => n.type !== 'personal').map((n) => (
                    <div key={n.id} className="p-4 rounded border border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                         <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                           n.target === 'all' ? 'bg-blue-100 text-blue-700' : 
                           n.target === 'admins' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                         }`}>
                           {n.target}
                         </span>
                         <span className="text-[10px] text-gray-500 font-medium">{n.date?.split('T')[0]}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1">{n.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
