import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateApplication } from '../../../features/applications/applicationsSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import StatusBadge from './StatusBadge.jsx';
import { MapPin, Clock, ChevronDown, ExternalLink } from 'lucide-react';
import { timeAgo } from '../../../utils/formatDate.js';

const ALL_STATUSES = [
  'pending', 'applied', 'under_review', 'shortlisted',
  'interviewing', 'offered', 'rejected', 'withdrawn',
];

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
const companyColor = (name = '') =>
  COMPANY_COLORS[(name.charCodeAt(0) || 0) % COMPANY_COLORS.length];

const SOURCE_LABELS = {
  naukri: 'Naukri', linkedin: 'LinkedIn', indeed: 'Indeed',
  foundit: 'Foundit', wellfound: 'Wellfound', manual: 'Manual',
};

const ApplicationCard = ({ application }) => {
  const dispatch        = useDispatch();
  const job             = application.jobId;
  const [open, setOpen] = useState(false);

  const company   = job?.company || 'Unknown';
  const initials  = company.slice(0, 2).toUpperCase();
  const gradient  = companyColor(company);

  const handleStatusChange = async (status) => {
    if (status === application.status) return;
    setOpen(false);
    await dispatch(updateApplication({ id: application._id, status }));
    dispatch(showToast({ message: `Status → ${status}`, type: 'success' }));
  };

  return (
    <div className="group bg-white border border-surface-200 rounded-2xl hover:shadow-card-hover hover:border-primary-100 transition-all duration-200">
      <div className="flex items-start gap-3.5 p-4">
        {/* Company avatar */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
          {initials}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <Link to={`/applications/${application._id}`} className="block group/link">
            <h3 className="font-semibold text-gray-900 group-hover/link:text-primary-700 transition-colors text-[15px] truncate">
              {job?.title || 'Unknown Position'}
            </h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {company !== 'Unknown' ? company : <span className="text-gray-400 italic">Unknown company</span>}
            </p>
          </Link>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            {job?.location && (
              <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
            )}
            {job?.source && (
              <span>{SOURCE_LABELS[job.source] || job.source}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={11} />{timeAgo(application.createdAt)}
            </span>
            {application.applyType === 'company_site' && application.companyApplyUrl && (
              <a
                href={application.companyApplyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary-600 hover:underline"
              >
                <ExternalLink size={10} /> Apply on site
              </a>
            )}
          </div>

          {application.notes && (
            <p className="mt-2 text-xs text-gray-400 line-clamp-1 italic">"{application.notes}"</p>
          )}
        </div>

        {/* Right: status + dropdown */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={application.status} />

          {/* Status changer dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-surface-100"
            >
              Change <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden animate-scale-in">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors capitalize ${
                        s === application.status
                          ? 'bg-primary-50 text-primary-700 font-semibold'
                          : 'text-gray-700 hover:bg-surface-50'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationCard;
