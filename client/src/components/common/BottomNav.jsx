import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, ClipboardList, FileText, MoreHorizontal,
  BookmarkCheck, Sparkles, Bot, BarChart2, User, LogOut, X,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth.js';

const PRIMARY_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { to: '/jobs',         icon: Briefcase,       label: 'Jobs' },
  { to: '/applications', icon: ClipboardList,   label: 'Applications' },
  { to: '/resumes',      icon: FileText,        label: 'Resumes' },
];

const MORE_ITEMS = [
  { to: '/saved-jobs', icon: BookmarkCheck, label: 'Saved Jobs' },
  { to: '/ai/analyse', icon: Sparkles,      label: 'AI Tools' },
  { to: '/automation', icon: Bot,           label: 'Automation' },
  { to: '/analytics',  icon: BarChart2,     label: 'Analytics' },
];

const MORE_PATHS = ['/saved-jobs', '/ai', '/automation', '/analytics', '/profile'];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isMoreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p));

  const handleLogout = () => {
    setSheetOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-elevated border-t border-line
          flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]"
      >
        {PRIMARY_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-ink-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            isMoreActive ? 'text-primary-600' : 'text-ink-muted'
          }`}
        >
          <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.4 : 2} />
          <span>More</span>
        </button>
      </nav>

      {/* "More" bottom sheet */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 inset-x-0 bg-elevated rounded-t-2xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-ink">More</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:bg-elevated-2 hover:text-ink transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 px-3 py-2">
              {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSheetOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-ink-muted hover:bg-elevated-2 hover:text-ink transition-colors text-center"
                >
                  <Icon size={20} />
                  <span className="text-[11px] font-medium leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>

            <div className="border-t border-line mt-1 p-2">
              <NavLink
                to="/profile"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-elevated-2 transition-colors"
              >
                {user?.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{user?.name || 'Account'}</p>
                  <p className="text-xs text-ink-muted truncate">{user?.email || 'Profile & settings'}</p>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNav;
