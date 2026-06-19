import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../../features/ui/uiSlice.js';
import useAuth from '../../hooks/useAuth.js';
import {
  Menu, Bell, ChevronRight, User, Settings,
  LayoutDashboard, Briefcase, BookmarkCheck,
  FileText, BarChart2, ClipboardList, Sparkles, Bot,
} from 'lucide-react';

const ROUTE_META = {
  '/dashboard':    { label: 'Dashboard',    icon: LayoutDashboard },
  '/jobs':         { label: 'Jobs',         icon: Briefcase },
  '/saved-jobs':   { label: 'Saved Jobs',   icon: BookmarkCheck },
  '/resumes':      { label: 'Resumes',      icon: FileText },
  '/applications': { label: 'Applications', icon: ClipboardList },
  '/ai/analyse':   { label: 'AI Tools',     icon: Sparkles },
  '/automation':   { label: 'Automation',   icon: Bot },
  '/analytics':    { label: 'Analytics',    icon: BarChart2 },
  '/profile':      { label: 'Profile',      icon: User },
};

const Navbar = () => {
  const dispatch   = useDispatch();
  const location   = useLocation();
  const { user }   = useAuth();
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const [menuOpen, setMenuOpen] = useState(false);

  // Resolve breadcrumb from path
  const path  = '/' + location.pathname.split('/').filter(Boolean)[0];
  const meta  = ROUTE_META[path] || { label: 'CareerSync', icon: LayoutDashboard };
  const Icon  = meta.icon;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className="h-14 bg-white border-b border-surface-200 flex items-center justify-between px-4 shrink-0 shadow-xs z-20 relative">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-surface-100 hover:text-gray-700 transition-colors focus-ring"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-400 text-xs hidden sm:block">CareerSync</span>
          <ChevronRight size={12} className="text-gray-300 hidden sm:block" />
          <div className="flex items-center gap-1.5 font-semibold text-gray-800">
            <Icon size={14} className="text-primary-600" />
            <span>{meta.label}</span>
          </div>
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-lg text-gray-500 hover:bg-surface-100 hover:text-gray-700 transition-colors focus-ring"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full ring-1 ring-white" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-surface-100 transition-colors focus-ring"
          >
            {user?.profile?.avatar ? (
              <img
                src={user.profile.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-primary-100"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden md:block max-w-[120px] truncate">
              {user?.name?.split(' ')[0] || 'Account'}
            </span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-surface-200 z-40 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-surface-50 transition-colors"
                  >
                    <User size={14} className="text-gray-400" />
                    View Profile
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-surface-50 transition-colors"
                  >
                    <Settings size={14} className="text-gray-400" />
                    Preferences
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
