import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Activity, Target, LayoutDashboard, Users, Trophy, 
  Menu, X, LogOut, FileVideo, ShieldCheck, User, Zap, Mail, Brain 
} from 'lucide-react';

const athleteLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/record-test', label: 'Record Test', icon: <Target className="w-5 h-5" /> },
  { path: '/history', label: 'History', icon: <Activity className="w-5 h-5" /> },
  { path: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-5 h-5" /> },
  { path: '/profile', label: 'My Profile', icon: <User className="w-5 h-5" /> },
];

const adminLinks = [
  { path: '/admin', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/admin/messages', label: 'Messages', icon: <Mail className="w-5 h-5" /> },
  { path: '/admin/broadcast', label: 'Broadcast', icon: <Zap className="w-5 h-5" /> },
  { path: '/admin/submissions', label: 'Submissions', icon: <FileVideo className="w-5 h-5" /> },
  { path: '/admin/athletes', label: 'Athletes', icon: <Users className="w-5 h-5" /> },
  { path: '/admin/training', label: 'AI Training', icon: <Brain className="w-5 h-5" />, headOnly: true },
  { path: '/admin/create', label: 'Management', icon: <ShieldCheck className="w-5 h-5" />, headOnly: true },
  { path: '/profile', label: 'My Profile', icon: <User className="w-5 h-5" /> },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHead = user?.role === 'headadmin';
  const isAdmin = user?.role === 'admin' || isHead;
  
  const links = isAdmin ? adminLinks.filter(l => !l.headOnly || isHead) : athleteLinks;

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden text-foreground">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 relative z-40',
          collapsed ? 'w-[80px]' : 'w-[260px]'
        )}
      >
        <div className="h-20 flex items-center justify-center px-4 border-b border-slate-100 relative">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="SAI Sports" className="w-10 h-10 object-contain rounded-xl group-hover:-translate-y-0.5 transition-all duration-300" />
            {!collapsed && <span className="font-extrabold tracking-tight text-lg text-slate-900 leading-none mt-1">SAI SPORTS</span>}
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {links.map(l => {
            const active = location.pathname === l.path;
            return (
              <Link
                key={l.path}
                to={l.path}
                className={cn(
                  'flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative border border-transparent',
                  active
                    ? 'bg-slate-900 text-white shadow-premium'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                )}
                title={collapsed ? l.label : undefined}
              >
                <div className={cn("transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-primary")}>{l.icon}</div>
                {!collapsed && <span>{l.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : '← Collapse UI'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full overflow-y-auto">
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-6 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">
                {links.find(l => l.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-slate-900 tracking-tight">{user?.name}</p>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isHead ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : isAdmin ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`} />
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">{user?.role}</p>
              </div>
            </div>
            <Link to={isAdmin ? '/admin' : '/profile'} className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-indigo-300 transition-colors">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600">{user?.name?.charAt(0)?.toUpperCase()}</span>
                </div>
              )}
            </Link>
            <button
              onClick={() => { 
                logout(); 
                window.location.href = '/'; 
              }}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
              title="Logout"
            >
              <LogOut className="w-5 h-5 ml-1" />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-[1600px] w-full mx-auto relative p-6 sm:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 z-50 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside 
            className="fixed inset-y-0 left-0 z-[60] w-[260px] bg-white border-r border-slate-200 flex flex-col shadow-2xl"
          >
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
              <Link to="/" className="flex items-center gap-3">
                <img src="/logo.png" alt="SAI Sports" className="w-8 h-8 object-contain rounded-lg" />
                <span className="font-extrabold tracking-tight text-slate-900">SAI SPORTS</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-6 px-4 space-y-2">
              {links.map(l => {
                const active = location.pathname === l.path;
                return (
                  <Link
                    key={l.path}
                    to={l.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent',
                      active ? 'bg-slate-900 text-white shadow-premium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <div className={cn(active ? "text-white" : "text-slate-400")}>{l.icon}</div>
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}
