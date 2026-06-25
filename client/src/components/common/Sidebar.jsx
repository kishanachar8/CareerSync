import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard, Briefcase, BookmarkCheck,
  FileText, BarChart2, ClipboardList, Sparkles, Bot,
  LogOut, User,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth.js';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/jobs',         icon: Briefcase,       label: 'Jobs' },
      { to: '/saved-jobs',   icon: BookmarkCheck,   label: 'Saved' },
      { to: '/applications', icon: ClipboardList,   label: 'Applications' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/resumes',    icon: FileText,   label: 'Resumes' },
      { to: '/ai/analyse', icon: Sparkles,   label: 'AI Tools' },
      { to: '/automation', icon: Bot,        label: 'Automation' },
      { to: '/analytics',  icon: BarChart2,  label: 'Analytics' },
    ],
  },
];

const Sidebar = () => {
  const navigate          = useNavigate();
  const sidebarOpen       = useSelector((s) => s.ui.sidebarOpen);
  const { user, logout }  = useAuth();

  const showLabels = sidebarOpen;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      {/* Desktop only — mobile uses BottomNav instead */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen z-40 flex-col transition-all duration-300 ease-in-out
          bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800
          ${sidebarOpen ? 'lg:w-60' : 'lg:w-16'}`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-3 shrink-0 border-b border-white/10 ${showLabels ? 'gap-3' : 'lg:justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 shadow-glow">
            <Briefcase size={17} className="text-white" />
          </div>
          {showLabels && (
            <div className="animate-fade-in min-w-0 lg:block">
              <span className="font-bold text-white text-[15px] tracking-tight">CareerSync</span>
              <span className="block text-[10px] text-slate-400 tracking-widest uppercase -mt-0.5">AI Platform</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-2 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {showLabels && (
                <p className="section-label px-3 mb-1.5 text-slate-500">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : 'inactive'} ${!sidebarOpen ? 'lg:justify-center' : ''}`
                    }
                    title={!sidebarOpen ? label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className={`${!sidebarOpen ? 'lg:hidden' : ''} animate-fade-in`}>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-white/10 p-2 space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : 'inactive'} ${!sidebarOpen ? 'lg:justify-center' : ''}`
            }
            title={!sidebarOpen ? 'Profile' : undefined}
          >
            {user?.profile?.avatar ? (
              <img
                src={user.profile.avatar}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white/20"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-white">
                {initials[0] || <User size={12} />}
              </div>
            )}
            <div className={`min-w-0 animate-fade-in ${!sidebarOpen ? 'lg:hidden' : ''}`}>
              <p className="text-[13px] font-medium text-white truncate leading-tight">{user?.name || 'Account'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Profile & settings'}</p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            title={!sidebarOpen ? 'Logout' : undefined}
            className={`nav-item inactive w-full ${!sidebarOpen ? 'lg:justify-center' : ''} text-rose-400 hover:text-rose-300 hover:bg-rose-500/10`}
          >
            <LogOut size={16} className="shrink-0" />
            <span className={`animate-fade-in text-xs ${!sidebarOpen ? 'lg:hidden' : ''}`}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
