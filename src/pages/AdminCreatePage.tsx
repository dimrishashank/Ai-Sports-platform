import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ShieldCheck, User, Mail, Lock, ShieldAlert, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface AdminInfo {
  id: string;
  admin_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

export default function AdminCreatePage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Sub-admin list
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await authApi.listAdmins();
      setAdmins(data.admins);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');

    try {
      const result = await authApi.createAdmin(form);
      setMsg(`${result.message} (ID: ${result.admin?.admin_id || 'N/A'})`);
      setForm({ name: '', email: '', password: '' });
      loadAdmins(); // Refresh list
    } catch (error: any) {
      setErr(error.message || 'Failed to create admin');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (admin: AdminInfo) => {
    if (!window.confirm(`Are you sure you want to remove "${admin.name}" (${admin.admin_id})?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingId(admin.id);
    try {
      await authApi.deleteAdmin(admin.id);
      toast({ title: 'Admin Removed', description: `${admin.name} has been removed.` });
      loadAdmins(); // Refresh list
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId('');
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-screen-lg">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Management</h1>
          </div>
          <p className="text-gray-600 text-sm font-medium">Head Administrator console — create and manage sub-admin accounts.</p>
        </div>

        {/* Messages */}
        <div className="min-h-[40px] mb-4">
          {msg && (
            <div className="bg-green-50 text-green-700 text-sm font-medium rounded p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{msg}</span>
            </div>
          )}
          {err && (
            <div className="bg-red-50 text-red-600 text-sm font-medium rounded p-3 flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>

        {/* Create Admin Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-8 space-y-5 shadow-sm mb-8"
        >
          <h2 className="text-lg font-bold text-gray-900">Create New Sub-Admin</h2>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-blue-800 text-sm font-medium flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
            <span>Only you (HeadAdmin) can create and remove sub-admin accounts. Sub-admins cannot do this.</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Administrator name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <ShieldCheck className="w-5 h-5" />
            <span>{busy ? 'Creating...' : 'Create Sub-Admin Account'}</span>
          </button>
        </form>

        {/* Sub-Admin List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Current Sub-Admins</h2>
            <p className="text-sm text-gray-500">All sub-admin accounts created by you</p>
          </div>

          {loadingAdmins ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No sub-admins created yet</p>
              <p className="text-xs text-gray-400 mt-1">Use the form above to create one</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                          {admin.admin_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{admin.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{admin.created_at}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(admin)}
                          disabled={deletingId === admin.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {deletingId === admin.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
