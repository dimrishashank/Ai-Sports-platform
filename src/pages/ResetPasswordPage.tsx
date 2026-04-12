import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { authApi } from '@/lib/api';
import { Lock, Key, ShieldAlert, CheckCircle, ChevronRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    setErr('');

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setErr(error.message || 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
        <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4">
              <Key className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reset Password</h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">Enter your reset token and choose a new password.</p>
          </div>

          <div className="min-h-[40px] mb-2">
            {err && (
              <div className="bg-red-50 text-red-600 text-sm font-medium rounded p-3 flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-700 text-sm font-medium rounded p-3 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Password reset! Redirecting to login...</span>
              </div>
            )}
          </div>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reset Token</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Paste your reset token"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                <span>{busy ? 'Resetting...' : 'Reset Password'}</span>
                {!busy && <ChevronRight className="w-5 h-5" />}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
