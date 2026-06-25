import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../../features/ui/uiSlice.js';
import useAuth from '../../hooks/useAuth.js';
import ThemeToggle from './ThemeToggle.jsx';
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
    <header className="h-14 bg-elevated border-b border-line flex items-center justify-between px-3 sm:px-4 shrink-0 shadow-xs z-20 relative">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Desktop: collapses/expands the sidebar */}
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:flex p-1.5 rounded-lg text-ink-muted hover:bg-elevated-2 hover:text-ink transition-colors focus-ring"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-ink-muted text-xs hidden sm:block">CareerSync</span>
          <ChevronRight size={12} className="text-ink-muted/50 hidden sm:block" />
          <div className="flex items-center gap-1.5 font-semibold text-ink min-w-0">
            <Icon size={14} className="text-primary-600 shrink-0" />
            <span className="truncate">{meta.label}</span>
          </div>
        </div>
      </div>

      {/* Right: theme + notifications + user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <ThemeToggle />

        {/* Notifications */}
        <button
          type="button"
          className="relative p-1.5 rounded-lg text-ink-muted hover:bg-elevated-2 hover:text-ink transition-colors focus-ring"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full ring-1 ring-elevated" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 sm:pl-2 pr-1 py-1 rounded-lg hover:bg-elevated-2 transition-colors focus-ring"
          >
            {user?.profile?.avatar ? (
              <img
                src={user.profile.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-primary-100"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-ink hidden md:block max-w-[120px] truncate">
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
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-elevated rounded-xl shadow-lg border border-line z-40 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                  <p className="text-xs text-ink-muted truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink hover:bg-elevated-2 transition-colors"
                  >
                    <User size={14} className="text-ink-muted" />
                    View Profile
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink hover:bg-elevated-2 transition-colors"
                  >
                    <Settings size={14} className="text-ink-muted" />
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
