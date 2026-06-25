import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  fetchApplications,
  fetchApplicationStats,
} from '../../features/applications/applicationsSlice.js';
import {
  fetchGmailStatus, syncGmail, disconnectGmail, resetSyncResult,
} from '../../features/gmail/gmailSlice.js';
import { gmailApi } from '../../api/gmailApi.js';
import ApplicationCard from './components/ApplicationCard.jsx';
import { SkeletonCard } from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  Briefcase, TrendingUp, Star, CheckCircle2, XCircle,
  Mail, RefreshCw, X, AlertCircle, ChevronDown, ChevronUp,
  Clock,
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all',          label: 'All',          color: 'text-ink'        },
  { value: 'applied',      label: 'Applied',      color: 'text-blue-600'   },
  { value: 'interviewing', label: 'Interviewing', color: 'text-amber-600'  },
  { value: 'offered',      label: 'Offered',      color: 'text-emerald-600'},
  { value: 'rejected',     label: 'Rejected',     color: 'text-rose-600'   },
  { value: 'pending',      label: 'Pending',      color: 'text-ink-muted'  },
];

// ─── Gmail Sync Panel ─────────────────────────────────────────────────────────

const GmailPanel = () => {
  const dispatch = useDispatch();
  const { status, fetchState, syncState, syncResult, error } = useSelector((s) => s.gmail);
  const [showUpdates, setShowUpdates] = useState(false);
  const [connecting, setConnecting]   = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await gmailApi.getAuthUrl();
      window.location.href = res.data.data.url;
    } catch {
      setConnecting(false);
    }
  };

  const handleSync = () => {
    dispatch(resetSyncResult());
    dispatch(syncGmail()).then(() => dispatch(fetchApplications({})));
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect Gmail? Auto status updates will stop.')) {
      dispatch(disconnectGmail());
    }
  };

  if (fetchState === 'loading') {
    return <div className="h-[74px] skeleton rounded-2xl" />;
  }

  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 transition-colors ${
      status.connected
        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
        : 'bg-elevated border-line'
    }`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            status.connected ? 'bg-emerald-500' : 'bg-elevated-2'
          }`}>
            <Mail size={16} className={status.connected ? 'text-white' : 'text-ink-muted'} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              Gmail Sync
              {status.connected && (
                <span className="ml-2 text-xs font-normal text-emerald-600">● Connected</span>
              )}
            </p>
            {status.connected
              ? <p className="text-xs text-ink-muted truncate">{status.email}</p>
              : <p className="text-xs text-ink-muted">Connect to auto-update application statuses</p>
            }
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!status.connected && (
            <Button size="sm" onClick={handleConnect} disabled={connecting} loading={connecting}>
              <Mail size={13} />
              {connecting ? 'Redirecting…' : 'Connect Gmail'}
            </Button>
          )}
          {status.connected && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                disabled={syncState === 'loading'}
                loading={syncState === 'loading'}
              >
                <RefreshCw size={13} />
                {syncState === 'loading' ? 'Syncing…' : 'Sync Now'}
              </Button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Disconnect Gmail"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sync result */}
      {syncState === 'succeeded' && syncResult && (
        <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-ink-muted">
            Scanned <strong>{syncResult.total}</strong> emails
            {syncResult.updated > 0
              ? <> → updated <strong className="text-emerald-600">{syncResult.updated}</strong> application{syncResult.updated !== 1 ? 's' : ''}</>
              : ' — no status changes detected'}
          </p>

          {syncResult.updated > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowUpdates((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
              >
                {showUpdates ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showUpdates ? 'Hide' : 'Show'} updated applications
              </button>

              {showUpdates && (
                <div className="mt-2 space-y-1.5">
                  {syncResult.updates?.map((u, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-elevated/60 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{u.newStatus}</span>
                      <span className="text-ink-muted truncate">
                        <strong>{u.company}</strong>
                        <span className="text-ink-muted/70 ml-1">— {u.emailSubject?.slice(0, 55)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {status.connected && status.lastSyncAt && syncState !== 'loading' && !syncResult && (
        <p className="mt-2 text-xs text-ink-muted">
          Last sync: {new Date(status.lastSyncAt).toLocaleString()}
        </p>
      )}

      {(syncState === 'failed' || fetchState === 'failed') && error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, bg, color }) => (
  <div className="bg-elevated rounded-2xl border border-line shadow-card p-3.5 sm:p-4 flex items-center gap-3 sm:gap-3.5">
    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
      <Icon size={18} className={color} />
    </div>
    <div className="min-w-0">
      <p className="text-xl sm:text-2xl font-bold text-ink leading-none">{value}</p>
      <p className="text-xs text-ink-muted mt-1 truncate">{label}</p>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const ApplicationsDashboard = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { list, listStatus, stats, pagination } = useSelector((s) => s.applications);
  const [activeTab, setActiveTab] = useState('all');

  // Handle Gmail OAuth callback redirect
  useEffect(() => {
    if (searchParams.get('gmail') === 'connected') {
      dispatch(fetchGmailStatus());
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dispatch(fetchApplicationStats());
    dispatch(fetchGmailStatus());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchApplications({ status: activeTab === 'all' ? undefined : activeTab }));
  }, [dispatch, activeTab]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Applications</h1>
        <p className="text-sm text-ink-muted mt-0.5">Track every job application in one place.</p>
      </div>

      {/* Gmail Sync Panel */}
      <GmailPanel />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <StatCard icon={Briefcase}    label="Total"        value={stats.total        ?? 0} bg="bg-slate-100 dark:bg-slate-800"   color="text-slate-600 dark:text-slate-300"   />
        <StatCard icon={TrendingUp}   label="Applied"      value={stats.applied      ?? 0} bg="bg-blue-50 dark:bg-blue-950/40"     color="text-blue-600 dark:text-blue-400"    />
        <StatCard icon={Star}         label="Interviewing" value={stats.interviewing ?? 0} bg="bg-amber-50 dark:bg-amber-950/40"    color="text-amber-600 dark:text-amber-400"   />
        <StatCard icon={CheckCircle2} label="Offered"      value={stats.offered      ?? 0} bg="bg-emerald-50 dark:bg-emerald-950/40" color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Tabs */}
      <div className="bg-elevated rounded-2xl border border-line shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-line">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === 'all' ? stats.total : stats[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  activeTab === tab.value
                    ? `${tab.color} border-b-2 border-current -mb-px`
                    : 'text-ink-muted hover:text-ink border-b-2 border-transparent -mb-px'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === tab.value ? 'bg-current/10' : 'bg-elevated-2 text-ink-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {listStatus === 'loading' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {listStatus === 'succeeded' && list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-elevated-2 flex items-center justify-center mb-4">
                <Briefcase size={24} className="text-ink-muted/50" />
              </div>
              <p className="font-semibold text-ink">No applications here</p>
              <p className="text-sm text-ink-muted mt-1 px-4">
                {activeTab === 'all'
                  ? 'Browse jobs and start tracking your applications.'
                  : `No ${activeTab} applications yet.`}
              </p>
            </div>
          )}

          {listStatus === 'succeeded' && list.length > 0 && (
            <div className="space-y-2.5">
              {list.map((app) => (
                <ApplicationCard key={app._id} application={app} />
              ))}
            </div>
          )}
        </div>
      </div>

      {pagination?.totalPages > 1 && (
        <p className="text-center text-xs text-ink-muted">
          Showing {list.length} of {pagination.total} applications
        </p>
      )}
    </div>
  );
};

export default ApplicationsDashboard;
