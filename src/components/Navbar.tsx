import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Activity, Menu, X, LogOut, Target, ShieldCheck } from 'lucide-react';

const athleteLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
  { path: '/record-test', label: 'Tests', icon: <Target className="w-4 h-4" /> },
  { path: '/leaderboard', label: 'Leaderboard', icon: <span className="text-base">🏆</span> },
];

const adminLinks = [
  { path: '/admin', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
  { path: '/admin/submissions', label: 'Submissions', icon: <Target className="w-4 h-4" /> },
  { path: '/admin/athletes', label: 'Athletes', icon: <span className="text-base">👥</span> },
  { path: '/admin/broadcast', label: 'Broadcast', icon: <span className="text-base">📢</span> },
  { path: '/admin/messages', label: 'Messages', icon: <span className="text-base">💬</span> },
];

// Extra link for HeadAdmin only
const headAdminLink = { path: '/admin/create', label: 'Manage Admins', icon: <ShieldCheck className="w-4 h-4" /> };

export function Navbar() {
  const { user, authed, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine which links to show based on role
  const isAdmin = user?.role === 'admin' || user?.role === 'headadmin';
  const isHead = user?.role === 'headadmin';

  let links = user?.role === 'athlete' ? athleteLinks : adminLinks;
  // HeadAdmin gets the extra "Manage Admins" link
  if (isHead) {
    links = [...adminLinks, headAdminLink];
  }

  const roleLabel = user?.role === 'headadmin' ? 'Head Admin' : user?.role === 'admin' ? 'Sub-Admin' : user?.role;

  return (
    <nav className="fixed top-0 inset-x-0 z-[100] h-[72px] border-b border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          {authed && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-700"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="SAI Sports" className="w-10 h-10 object-contain rounded-xl group-hover:shadow-lg transition-all duration-300 group-hover:-translate-y-0.5" />
            <span className="font-extrabold tracking-tight text-slate-900 hidden sm:block text-lg">SAI SPORTS</span>
          </Link>
        </div>

        {authed && (
          <div className="hidden lg:flex items-center gap-1">
            {links.map(l => (
              <NavItem key={l.path} path={l.path} label={l.label} icon={l.icon} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {authed ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right mr-2">
                <p className="text-sm font-bold text-slate-900 tracking-tight">{user?.name}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isHead ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`} />
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">{roleLabel}</p>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-300"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {authed && mobileOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 px-4 py-3 shadow-md">
          <div className="flex flex-col gap-1">
            {links.map(l => (
              <Link
                key={l.path}
                to={l.path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                {l.icon}
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavItem({ path, label, icon }: { path: string; label: string; icon: React.ReactNode }) {
  const location = useLocation();
  const active = location.pathname === path;
  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300',
        active
          ? 'bg-slate-100 text-primary shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
