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
import Loader, { SkeletonCard } from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  Briefcase, TrendingUp, Star, CheckCircle2, XCircle,
  Mail, RefreshCw, X, AlertCircle, ChevronDown, ChevronUp,
  Clock,
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all',          label: 'All',          color: 'text-gray-600'   },
  { value: 'applied',      label: 'Applied',      color: 'text-blue-600'   },
  { value: 'interviewing', label: 'Interviewing', color: 'text-amber-600'  },
  { value: 'offered',      label: 'Offered',      color: 'text-emerald-600'},
  { value: 'rejected',     label: 'Rejected',     color: 'text-rose-600'   },
  { value: 'pending',      label: 'Pending',      color: 'text-gray-400'   },
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

  if (fetchState === 'loading') return null;

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${
      status.connected
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-surface-200'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            status.connected ? 'bg-emerald-500' : 'bg-gray-100'
          }`}>
            <Mail size={16} className={status.connected ? 'text-white' : 'text-gray-500'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Gmail Sync
              {status.connected && (
                <span className="ml-2 text-xs font-normal text-emerald-600">● Connected</span>
              )}
            </p>
            {status.connected
              ? <p className="text-xs text-gray-500">{status.email}</p>
              : <p className="text-xs text-gray-400">Connect to auto-update application statuses</p>
            }
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                onClick={handleDisconnect}
                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
        <div className="mt-3 pt-3 border-t border-emerald-200">
          <p className="text-xs text-gray-600">
            Scanned <strong>{syncResult.total}</strong> emails
            {syncResult.updated > 0
              ? <> → updated <strong className="text-emerald-600">{syncResult.updated}</strong> application{syncResult.updated !== 1 ? 's' : ''}</>
              : ' — no status changes detected'}
          </p>

          {syncResult.updated > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowUpdates((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
              >
                {showUpdates ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showUpdates ? 'Hide' : 'Show'} updated applications
              </button>

              {showUpdates && (
                <div className="mt-2 space-y-1.5">
                  {syncResult.updates?.map((u, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-white/60 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold text-emerald-700">{u.newStatus}</span>
                      <span className="text-gray-600 truncate">
                        <strong>{u.company}</strong>
                        <span className="text-gray-400 ml-1">— {u.emailSubject?.slice(0, 55)}</span>
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
        <p className="mt-2 text-xs text-gray-400">
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
  <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-4 flex items-center gap-3.5">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
      <Icon size={19} className={color} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
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
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track every job application in one place.</p>
      </div>

      {/* Gmail Sync Panel */}
      <GmailPanel />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Briefcase}    label="Total"        value={stats.total        ?? 0} bg="bg-slate-100"   color="text-slate-600"   />
        <StatCard icon={TrendingUp}   label="Applied"      value={stats.applied      ?? 0} bg="bg-blue-50"     color="text-blue-600"    />
        <StatCard icon={Star}         label="Interviewing" value={stats.interviewing ?? 0} bg="bg-amber-50"    color="text-amber-600"   />
        <StatCard icon={CheckCircle2} label="Offered"      value={stats.offered      ?? 0} bg="bg-emerald-50"  color="text-emerald-600" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-surface-100">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === 'all' ? stats.total : stats[tab.value];
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  activeTab === tab.value
                    ? `${tab.color} border-b-2 border-current -mb-px`
                    : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent -mb-px'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === tab.value ? 'bg-current/10' : 'bg-surface-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4">
          {listStatus === 'loading' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {listStatus === 'succeeded' && list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                <Briefcase size={24} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No applications here</p>
              <p className="text-sm text-gray-400 mt-1">
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
        <p className="text-center text-xs text-gray-400">
          Showing {list.length} of {pagination.total} applications
        </p>
      )}
    </div>
  );
};

export default ApplicationsDashboard;
