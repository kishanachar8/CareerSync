import { Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loader from '../components/common/Loader.jsx';
import { Briefcase, Sparkles, Bot, BarChart2 } from 'lucide-react';

const FEATURES = [
  { icon: Briefcase, label: 'Multi-portal job aggregation', sub: '15+ job boards in one place' },
  { icon: Sparkles,  label: 'AI resume matching',           sub: 'Match score & skill gap analysis' },
  { icon: Bot,       label: 'Naukri auto-apply bot',        sub: 'Playwright-powered automation' },
  { icon: BarChart2, label: 'Application analytics',        sub: 'Track every stage of your search' },
];

const AuthLayout = () => {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <Loader fullPage />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding + features */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 relative overflow-hidden flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
              <Briefcase size={19} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">CareerSync</h1>
              <p className="text-[11px] text-slate-400 tracking-widest uppercase">AI Platform</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white leading-snug text-balance">
            Your AI-powered<br />job search hub
          </h2>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-xs">
            Aggregate jobs, automate applications, analyse your resume with AI — all in one place.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Icon size={16} className="text-primary-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-[12px] text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} CareerSync. Built with React + Node.js
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-canvas">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-ink">CareerSync</span>
          </div>

          <div className="bg-elevated rounded-2xl shadow-lg border border-line p-6 sm:p-8">
            <Suspense fallback={<Loader text="Loading…" />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
