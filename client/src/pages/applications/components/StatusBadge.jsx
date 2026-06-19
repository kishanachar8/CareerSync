const CONFIG = {
  pending:       { label: 'Pending',      dot: 'bg-gray-400',     cls: 'bg-gray-100    text-gray-700    ring-1 ring-gray-200'    },
  pending_manual:{ label: 'Manual Apply', dot: 'bg-slate-400',    cls: 'bg-slate-100   text-slate-700   ring-1 ring-slate-200'   },
  applied:       { label: 'Applied',      dot: 'bg-blue-500',     cls: 'bg-blue-50     text-blue-700    ring-1 ring-blue-200'    },
  under_review:  { label: 'Under Review', dot: 'bg-indigo-500',   cls: 'bg-indigo-50   text-indigo-700  ring-1 ring-indigo-200'  },
  shortlisted:   { label: 'Shortlisted',  dot: 'bg-violet-500',   cls: 'bg-violet-50   text-violet-700  ring-1 ring-violet-200'  },
  interviewing:  { label: 'Interviewing', dot: 'bg-amber-500',    cls: 'bg-amber-50    text-amber-700   ring-1 ring-amber-200'   },
  offered:       { label: 'Offered',      dot: 'bg-emerald-500',  cls: 'bg-emerald-50  text-emerald-700 ring-1 ring-emerald-200' },
  rejected:      { label: 'Rejected',     dot: 'bg-rose-500',     cls: 'bg-rose-50     text-rose-700    ring-1 ring-rose-200'    },
  withdrawn:     { label: 'Withdrawn',    dot: 'bg-purple-400',   cls: 'bg-purple-50   text-purple-700  ring-1 ring-purple-200'  },
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
