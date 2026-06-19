import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchApplicationStats } from '../../features/applications/applicationsSlice.js';
import { fetchResumes } from '../../features/resume/resumeSlice.js';
import {
  Briefcase, FileText, ClipboardList, Sparkles,
  TrendingUp, BookmarkCheck, ArrowRight, Bot,
  CheckCircle2, XCircle, Clock, Star, Zap,
  BarChart2, Target,
} from 'lucide-react';

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, color, bg, icon: Icon, trend }) => (
  <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-5 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
      <Icon size={20} className={color} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-gray-900 leading-none">{value ?? 0}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  </div>
);

// ─── Quick Action ─────────────────────────────────────────────────────────────

const QuickAction = ({ to, icon: Icon, label, sub, gradient }) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-2xl p-5 text-white hover:scale-[1.02] transition-transform duration-200 shadow-md hover:shadow-lg"
    style={{ background: gradient }}
  >
    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
    <div className="absolute -right-2 bottom-2 w-12 h-12 bg-white/5 rounded-full" />
    <Icon size={22} className="relative z-10 mb-3 opacity-90" />
    <p className="relative z-10 font-semibold text-[15px] leading-tight">{label}</p>
    <p className="relative z-10 text-white/70 text-xs mt-1">{sub}</p>
    <ArrowRight size={14} className="relative z-10 mt-3 opacity-60 group-hover:translate-x-1 transition-transform" />
  </Link>
);

// ─── Tip ──────────────────────────────────────────────────────────────────────

const Tip = ({ icon: Icon, title, body, color }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200 hover:border-primary-100 transition-colors">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={15} className="text-white" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const TIPS = [
  {
    icon: Target,
    title: 'Upload your resume first',
    body: 'AI analysis & cover letter generation both need your resume on file.',
    color: 'bg-primary-600',
  },
  {
    icon: Sparkles,
    title: 'Run the AI Skill Gap tool',
    body: "See exactly which skills you're missing for your target role.",
    color: 'bg-violet-600',
  },
  {
    icon: BarChart2,
    title: 'Track every application',
    body: 'Log every application so Analytics shows meaningful pipeline data.',
    color: 'bg-emerald-600',
  },
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user }    = useSelector((s) => s.auth);
  const { stats }   = useSelector((s) => s.applications);
  const { resumes } = useSelector((s) => s.resume);

  useEffect(() => {
    dispatch(fetchApplicationStats());
    dispatch(fetchResumes());
  }, [dispatch]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-7 max-w-5xl">
      {/* ── Hero greeting ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 rounded-2xl p-7 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <p className="text-primary-200 text-sm font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-primary-200 mt-1.5 text-sm">
            {stats.total > 0
              ? `You have ${stats.total} application${stats.total !== 1 ? 's' : ''} tracked — keep the momentum going.`
              : 'Ready to start your job search? Browse jobs or upload your resume below.'}
          </p>
        </div>

        {/* Inline mini stats */}
        <div className="relative z-10 flex gap-5 mt-6 pt-5 border-t border-white/20">
          {[
            { label: 'Applications', value: stats.total ?? 0 },
            { label: 'Interviewing', value: stats.interviewing ?? 0 },
            { label: 'Offers',       value: stats.offered ?? 0 },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-primary-300">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Application stats ── */}
      <section>
        <h2 className="section-label mb-3">Application Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total"        value={stats.total}        icon={ClipboardList}  bg="bg-slate-100"    color="text-slate-600"  />
          <StatCard label="Applied"      value={stats.applied}      icon={Briefcase}      bg="bg-blue-50"      color="text-blue-600"   />
          <StatCard label="Interviewing" value={stats.interviewing} icon={Star}           bg="bg-amber-50"     color="text-amber-600"  />
          <StatCard label="Offered"      value={stats.offered}      icon={CheckCircle2}   bg="bg-emerald-50"   color="text-emerald-600"/>
          <StatCard label="Rejected"     value={stats.rejected}     icon={XCircle}        bg="bg-rose-50"      color="text-rose-500"   />
          <StatCard label="Pending"      value={stats.pending}      icon={Clock}          bg="bg-gray-100"     color="text-gray-500"   />
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section>
        <h2 className="section-label mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickAction
            to="/jobs"
            icon={Briefcase}
            label="Browse Jobs"
            sub="Search 15+ portals"
            gradient="linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
          />
          <QuickAction
            to="/applications"
            icon={ClipboardList}
            label="My Applications"
            sub={`${stats.total ?? 0} tracked`}
            gradient="linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)"
          />
          <QuickAction
            to="/resumes"
            icon={FileText}
            label="Resumes"
            sub={`${resumes?.length ?? 0} uploaded`}
            gradient="linear-gradient(135deg, #0d9488 0%, #0f766e 100%)"
          />
          <QuickAction
            to="/ai/analyse"
            icon={Sparkles}
            label="AI Analysis"
            sub="Match & gap analysis"
            gradient="linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
          />
          <QuickAction
            to="/saved-jobs"
            icon={BookmarkCheck}
            label="Saved Jobs"
            sub="Bookmarked roles"
            gradient="linear-gradient(135deg, #d97706 0%, #b45309 100%)"
          />
          <QuickAction
            to="/automation"
            icon={Bot}
            label="Auto-Apply"
            sub="Naukri bot"
            gradient="linear-gradient(135deg, #0891b2 0%, #0e7490 100%)"
          />
          <QuickAction
            to="/analytics"
            icon={TrendingUp}
            label="Analytics"
            sub="Track your progress"
            gradient="linear-gradient(135deg, #be185d 0%, #9d174d 100%)"
          />
          <QuickAction
            to="/ai/cover-letter"
            icon={Zap}
            label="Cover Letter"
            sub="Generate with AI"
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
          />
        </div>
      </section>

      {/* ── Tips ── */}
      <section>
        <h2 className="section-label mb-3">Pro Tips</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIPS.map((tip) => (
            <Tip key={tip.title} {...tip} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
