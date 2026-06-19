import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { saveJob, unsaveJob } from '../../../features/jobs/jobsSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Badge from '../../../components/ui/Badge.jsx';
import { MapPin, Briefcase, Bookmark, BookmarkCheck, Clock, DollarSign } from 'lucide-react';
import { timeAgo } from '../../../utils/formatDate.js';

// Source config: color + abbreviation for the pill
const SOURCE_CFG = {
  naukri:    { label: 'Naukri',    cls: 'bg-yellow-50   text-yellow-700  ring-yellow-200'  },
  linkedin:  { label: 'LinkedIn',  cls: 'bg-blue-50     text-blue-700    ring-blue-200'    },
  indeed:    { label: 'Indeed',    cls: 'bg-indigo-50   text-indigo-700  ring-indigo-200'  },
  foundit:   { label: 'Foundit',   cls: 'bg-orange-50   text-orange-700  ring-orange-200'  },
  wellfound: { label: 'Wellfound', cls: 'bg-emerald-50  text-emerald-700 ring-emerald-200' },
  adzuna:    { label: 'Adzuna',    cls: 'bg-violet-50   text-violet-700  ring-violet-200'  },
  jooble:    { label: 'Jooble',    cls: 'bg-teal-50     text-teal-700    ring-teal-200'    },
  remoteok:  { label: 'RemoteOK',  cls: 'bg-green-50    text-green-700   ring-green-200'   },
  arbeitnow: { label: 'Arbeit',    cls: 'bg-rose-50     text-rose-700    ring-rose-200'    },
  jobicy:    { label: 'Jobicy',    cls: 'bg-purple-50   text-purple-700  ring-purple-200'  },
  themuse:   { label: 'TheMuse',   cls: 'bg-pink-50     text-pink-700    ring-pink-200'    },
  findwork:  { label: 'Findwork',  cls: 'bg-amber-50    text-amber-700   ring-amber-200'   },
  reed:      { label: 'Reed',      cls: 'bg-red-50      text-red-700     ring-red-200'     },
  manual:    { label: 'Manual',    cls: 'bg-gray-100    text-gray-600    ring-gray-200'    },
};

// Deterministic hue for company avatars based on first letter
const COMPANY_COLORS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
  'from-teal-500 to-teal-700',
  'from-indigo-500 to-indigo-700',
  'from-orange-500 to-orange-700',
];

const companyColor = (name = '') => {
  const code = (name.charCodeAt(0) || 0) % COMPANY_COLORS.length;
  return COMPANY_COLORS[code];
};

const formatSalary = (salary) => {
  if (!salary?.min && !salary?.max) return null;
  const cur = salary.currency || '₹';
  const fmt = (n) => n >= 100000 ? `${(n / 100000).toFixed(0)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n;
  const range = [
    salary.min ? `${cur}${fmt(salary.min)}` : '',
    salary.max ? `${cur}${fmt(salary.max)}` : '',
  ].filter(Boolean).join(' – ');
  return `${range} / ${salary.period || 'yr'}`;
};

const JobCard = ({ job }) => {
  const dispatch = useDispatch();
  const savedIds = useSelector((s) => s.jobs.savedJobIds);
  const isSaved  = savedIds.includes(job._id);

  const srcCfg     = SOURCE_CFG[job.source] || SOURCE_CFG.manual;
  const initials   = job.company?.slice(0, 2).toUpperCase() || '??';
  const gradient   = companyColor(job.company);
  const salary     = formatSalary(job.salary);

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) {
      await dispatch(unsaveJob(job._id));
      dispatch(showToast({ message: 'Removed from saved', type: 'info' }));
    } else {
      await dispatch(saveJob(job._id));
      dispatch(showToast({ message: 'Job saved', type: 'success' }));
    }
  };

  return (
    <Link
      to={`/jobs/${job._id}`}
      className="group block bg-white border border-surface-200 rounded-2xl p-4 hover:border-primary-200 hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex items-start gap-3.5">
        {/* Company avatar */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors text-[15px] leading-snug truncate">
                {job.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{job.company}</p>
            </div>

            {/* Bookmark */}
            <button
              type="button"
              onClick={handleSave}
              aria-label={isSaved ? 'Remove bookmark' : 'Save job'}
              className={`p-1.5 rounded-lg transition-all shrink-0 ${
                isSaved
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-300 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {/* Source pill */}
            <span className={`pill ring-1 text-[11px] font-semibold ${srcCfg.cls}`}>
              {srcCfg.label}
            </span>

            {job.location && !(job.source === 'naukri' && job.location.toLowerCase() === 'remote') && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={11} />
                <span className="truncate max-w-[140px]">{job.location}</span>
              </span>
            )}

            {job.employmentType && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Briefcase size={11} />
                <span className="capitalize">{job.employmentType.replace(/-/g, ' ')}</span>
              </span>
            )}

            {job.postedAt && (
              <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                <Clock size={11} />
                {timeAgo(job.postedAt)}
              </span>
            )}
          </div>

          {/* Salary */}
          {salary && (
            <div className="flex items-center gap-1 mt-2 text-emerald-700 font-semibold text-sm">
              <DollarSign size={13} />
              {salary}
            </div>
          )}

          {/* Skills */}
          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {job.skills.slice(0, 5).map((s) => (
                <Badge key={s} variant="gray" size="sm">{s}</Badge>
              ))}
              {job.skills.length > 5 && (
                <Badge variant="outline" size="sm">+{job.skills.length - 5} more</Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default JobCard;
