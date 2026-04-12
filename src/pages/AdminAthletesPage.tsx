import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { athletesApi } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { ExportButton } from '@/components/common/ExportButton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, Search, Filter, UserPlus, MoreVertical, X, Check, ShieldAlert } from 'lucide-react';

export default function AdminAthletesPage() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [region, setRegion] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', age: '', gender: 'Male', location: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAthletes();
  }, [q, status, region]);

  const loadAthletes = () => {
    setLoading(true);
    athletesApi.list({
      q: q || undefined,
      status: status !== 'all' ? status : undefined,
      region: region !== 'all' ? region : undefined,
    })
      .then(data => setAthletes(data.athletes))
      .catch(err => console.error('Athletes error:', err))
      .finally(() => setLoading(false));
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await athletesApi.updateStatus(id, newStatus);
      loadAthletes();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCreateAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await athletesApi.create({
        ...createForm,
        age: parseInt(createForm.age) || undefined,
      });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', age: '', gender: 'Male', location: '' });
      loadAthletes();
    } catch (err: any) {
      alert(err.message || 'Failed to create athlete');
    } finally {
      setBusy(false);
    }
  };

  const handleExportAthletes = async () => {
    try {
      const headers = ['Name', 'Age', 'Gender', 'Location', 'Tests Taken', 'Avg Percentile', 'Status'];
      const rows = athletes.map(a => [
        `"${a.name}"`,
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
      link.setAttribute('download', `sai_athletes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate export.');
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Athlete Registry</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">Manage all registered athletes across India</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Add Athlete
            </button>
            <div className="w-[180px]">
              <ExportButton label="Export Athletes" onExport={handleExportAthletes} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 flex flex-wrap gap-5 items-end mb-10">
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Filters</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search athletes..."
                className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Region</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none min-w-[140px] shadow-sm transition-all cursor-pointer"
            >
              <option value="all">All Regions</option>
              <option value="Dehradun">Dehradun</option>
              <option value="Nainital">Nainital</option>
              <option value="Haridwar">Haridwar</option>
              <option value="Rishikesh">Rishikesh</option>
              <option value="Mussoorie">Mussoorie</option>
              <option value="Tehri">Tehri</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none min-w-[130px] shadow-sm transition-all cursor-pointer"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="flagged">Flagged</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-auto bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">{athletes.length} athletes</span>
        </div>

        {/* Table */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-slate-100/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Name</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Age</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Gender</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Location</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Tests</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Avg %</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest text-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {athletes.map((a) => (
                    <tr 
                      key={a.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <Link 
                          to={`/admin/athletes/${a.id}`}
                          className="flex items-center gap-3 text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors"
                        >
                          {a.profile_photo ? (
                            <img src={a.profile_photo} alt={a.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-sm shrink-0">
                              {a.name.slice(0, 2)}
                            </div>
                          )}
                          {a.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{a.age}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{a.gender}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">{a.location}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{a.tests}</td>
                      <td className="px-6 py-4 text-sm font-extrabold text-indigo-600">{a.avgPct}%</td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={a.status === 'active' ? 'success' : a.status === 'flagged' ? 'destructive' : 'outline'}>
                          {a.status}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {a.status === 'active' ? (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'flagged')}
                              title="Block Athlete"
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <ShieldAlert className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'active')}
                              title="Unblock Athlete"
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          )}
                          <Link 
                            to={`/admin/athletes/${a.id}`}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="View Full Profile"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-premium overflow-hidden border border-white/20 scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Manual Athlete Creation</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAthlete} className="p-8 space-y-6 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Full Name</label>
                  <input
                    required
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm({...createForm, name: e.target.value})}
                    placeholder="e.g. Rahul Kumar"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Email (Login ID)</label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({...createForm, email: e.target.value})}
                    placeholder="rahul@example.com"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Temp Password</label>
                  <input
                    required
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm({...createForm, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Age</label>
                  <input
                    type="number"
                    value={createForm.age}
                    onChange={e => setCreateForm({...createForm, age: e.target.value})}
                    placeholder="18"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Gender</label>
                  <select
                    value={createForm.gender}
                    onChange={e => setCreateForm({...createForm, gender: e.target.value})}
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none transition-all shadow-sm cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Location</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={e => setCreateForm({...createForm, location: e.target.value})}
                    placeholder="e.g. Dehradun"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-premium hover:shadow-premium-hover transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-5 h-5" />
                  {busy ? 'Creating...' : 'Finalize Creation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
