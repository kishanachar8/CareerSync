const CONFIG = {
  pending:       { label: 'Pending',      dot: 'bg-gray-400',    cls: 'bg-elevated-2 text-ink-muted ring-1 ring-line' },
  pending_manual:{ label: 'Manual Apply', dot: 'bg-slate-400',   cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' },
  applied:       { label: 'Applied',      dot: 'bg-blue-500',    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800' },
  under_review:  { label: 'Under Review', dot: 'bg-indigo-500',  cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800' },
  shortlisted:   { label: 'Shortlisted',  dot: 'bg-violet-500',  cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800' },
  interviewing:  { label: 'Interviewing', dot: 'bg-amber-500',   cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800' },
  offered:       { label: 'Offered',      dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800' },
  rejected:      { label: 'Rejected',     dot: 'bg-rose-500',    cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800' },
  withdrawn:     { label: 'Withdrawn',    dot: 'bg-purple-400',  cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-800' },
};

const StatusBadge = ({ status, showDot = true }) => {
  const cfg = CONFIG[status] || CONFIG.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
