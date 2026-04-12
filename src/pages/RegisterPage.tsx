import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { ChevronRight, Mail, Lock, ShieldAlert, User, MapPin, Calendar, Users } from 'lucide-react';

const Field = ({ 
  id, label, icon: Icon, type = 'text', placeholder = '', value, onChange 
}: { 
  id: string; label: string; icon: any; type?: string; placeholder?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">{label}</label>
    <div className="relative group">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
      />
    </div>
  </div>
);

export default function RegisterPage() {
  const { register, authed, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (authed && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [authed, loading, navigate]);

  if (loading) return null;
  const [form, setForm] = useState({
    name: '', email: '', password: '', dob: '', gender: '', location: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');

    try {
      await register(form);
      navigate('/dashboard');
    } catch (error: any) {
      setErr(error.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleFieldChange = (id: string, value: string) => {
    setForm(prev => ({ ...prev, [id]: value }));
  };

  return (
    <AppLayout>
      <div className="flex-grow flex items-center justify-center px-4 py-12 relative z-10 bg-gradient-to-br from-background via-slate-50 to-secondary/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent pointer-events-none" />
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl max-w-[460px] w-full p-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white/60 relative z-10 hover:shadow-[0_8px_50px_rgba(0,0,0,0.06)] transition-shadow duration-500">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide">Join the SAI athlete platform.</p>
          </div>

          <div className="min-h-[40px] mb-4">
            {err ? (
              <div className="bg-red-50/80 border border-red-100 text-red-600 text-sm font-semibold rounded-xl p-3 flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{err}</span>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Date of Birth</label>
                <div className="relative group">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="date"
                    value={form.dob}
                    onChange={e => setForm({ ...form, dob: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Gender</label>
                <div className="relative group">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <select
                    value={form.gender}
                    onChange={e => handleFieldChange('gender', e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none"
                  >
                    <option value="" disabled hidden>Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>

            <Field id="location" label="Location" icon={MapPin} placeholder="City, State" value={form.location} onChange={e => handleFieldChange('location', e.target.value)} />
            <Field id="password" label="Password" icon={Lock} type="password" placeholder="••••••••" value={form.password} onChange={e => handleFieldChange('password', e.target.value)} />
            
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.39)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span>{busy ? 'Creating...' : 'Create Account'}</span>
              {!busy && <ChevronRight className="w-5 h-5 -mr-1" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm font-medium text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline underline-offset-4 transition-all">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
