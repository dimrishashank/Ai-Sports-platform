import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { authApi } from '@/lib/api';
import { Mail, ShieldAlert, ChevronRight, Copy, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setToken('');

    try {
      const data = await authApi.forgotPassword(email);
      setToken(data.reset_token);
    } catch (error: any) {
      setErr(error.message || 'Failed to send reset link');
    } finally {
      setBusy(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
        <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot Password</h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">Enter your email and we'll generate a reset token.</p>
          </div>

          <div className="min-h-[40px] mb-2">
            {err && (
              <div className="bg-red-50 text-red-600 text-sm font-medium rounded p-3 flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
          </div>

          {!token ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70 transition-colors"
              >
                <span>{busy ? 'Generating...' : 'Generate Reset Token'}</span>
                {!busy && <ChevronRight className="w-5 h-5" />}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 text-sm font-medium rounded p-4 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>Reset token generated! Copy it and go to the reset page.</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4 flex items-center gap-3">
                <code className="text-xs text-blue-600 font-mono flex-1 break-all">{token}</code>
                <button onClick={copyToken} className="shrink-0 p-2 hover:bg-gray-200 rounded transition-colors text-gray-500">
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Link
                to="/reset-password"
                className="block w-full text-center py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Go to Reset Password Page →
              </Link>
            </div>
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
