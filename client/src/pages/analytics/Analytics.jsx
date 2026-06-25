import { useEffect, useMemo, useState } from 'react';
import { fetchAnalytics } from '../../api/analyticsApi.js';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { BarChart2, TrendingUp, Target, Award, AlertCircle, RefreshCw } from 'lucide-react';

const STATUS_COLORS = {
  pending:      'bg-gray-400',
  applied:      'bg-blue-500',
  interviewing: 'bg-yellow-500',
  offered:      'bg-green-500',
  rejected:     'bg-red-400',
  withdrawn:    'bg-purple-400',
};

const SOURCE_COLORS = {
  naukri:    'bg-orange-400',
  linkedin:  'bg-blue-600',
  indeed:    'bg-blue-400',
  foundit:   'bg-teal-500',
  wellfound: 'bg-indigo-500',
  adzuna:    'bg-purple-500',
  jooble:    'bg-teal-400',
  remoteok:  'bg-emerald-500',
  arbeitnow: 'bg-rose-400',
  jobicy:    'bg-violet-500',
  themuse:   'bg-pink-400',
  findwork:  'bg-amber-500',
  reed:      'bg-red-500',
  manual:    'bg-gray-400',
  unknown:   'bg-gray-300',
};

const MetricCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-elevated border border-line rounded-xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-ink-muted">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
    <p className="text-3xl font-bold text-ink">{value}</p>
    {sub && <p className="text-xs text-ink-muted/80 mt-1">{sub}</p>}
  </div>
);

const BarGroup = ({ label, count, max, color }) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-muted w-20 text-right capitalize">{label}</span>
      <div className="flex-1 bg-elevated-2 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-ink w-6 text-right">{count}</span>
    </div>
  );
};

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics()
      .then(({ data: res }) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const { statusBreakdown = {}, applicationsOverTime = [], sourceBreakdown = [], metrics = {} } = data || {};

  // Hooks must run on every render (not after the early returns below), so these
  // stay above the loading/error checks even though they're only used past them.
  const maxWeekly = useMemo(
    () => Math.max(...applicationsOverTime.map((w) => w.count), 1),
    [applicationsOverTime],
  );
  const maxStatus = useMemo(
    () => Math.max(...Object.values(statusBreakdown), 1),
    [statusBreakdown],
  );
  const maxSource = useMemo(
    () => Math.max(...sourceBreakdown.map((s) => s.count), 1),
    [sourceBreakdown],
  );

  if (loading) return <Loader fullPage />;
  if (error) return (
    <div className="max-w-3xl mx-auto py-16">
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
          <AlertCircle size={22} className="text-rose-600 dark:text-rose-300" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Analytics unavailable</h2>
        <p className="mt-2 text-sm text-ink-muted">{error}</p>
        <Button variant="secondary" size="sm" className="mt-5 gap-2" onClick={() => window.location.reload()}>
          <RefreshCw size={14} />Try again
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <BarChart2 size={24} className="text-primary-600" />
          Analytics
        </h1>
        <p className="text-sm text-ink-muted mt-1">Your job search performance at a glance.</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Target}    label="Total Applied"   value={metrics.total || 0}         color="bg-primary-600" />
        <MetricCard icon={TrendingUp} label="Response Rate"  value={`${metrics.responseRate || 0}%`} sub="interviewing + offers" color="bg-yellow-500" />
        <MetricCard icon={Award}     label="Offer Rate"      value={`${metrics.offerRate || 0}%`}     sub="offers / total"       color="bg-green-600" />
        <MetricCard icon={BarChart2} label="Interviewing"    value={statusBreakdown.interviewing || 0} color="bg-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <Card>
          <Card.Header><h2 className="font-semibold text-ink">Applications by Status</h2></Card.Header>
          <Card.Body className="space-y-3">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <BarGroup
                key={status}
                label={status}
                count={statusBreakdown[status] || 0}
                max={maxStatus}
                color={color}
              />
            ))}
          </Card.Body>
        </Card>

        {/* Source breakdown */}
        <Card>
          <Card.Header><h2 className="font-semibold text-ink">Applications by Source</h2></Card.Header>
          <Card.Body className="space-y-3">
            {sourceBreakdown.length === 0 ? (
              <p className="text-sm text-ink-muted/80">No data yet</p>
            ) : (
              sourceBreakdown.map(({ source, count }) => (
                <BarGroup
                  key={source}
                  label={source}
                  count={count}
                  max={maxSource}
                  color={SOURCE_COLORS[source] || 'bg-gray-400'}
                />
              ))
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Weekly activity */}
      {applicationsOverTime.length > 0 && (
        <Card>
          <Card.Header><h2 className="font-semibold text-ink">Weekly Activity (Last 12 Weeks)</h2></Card.Header>
          <Card.Body>
            <div className="flex items-end gap-2 h-32">
              {applicationsOverTime.map(({ label, count }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-ink-muted">{count > 0 ? count : ''}</span>
                  <div
                    className="w-full bg-primary-500 rounded-t transition-all duration-500"
                    style={{ height: `${Math.round((count / maxWeekly) * 96)}px` }}
                  />
                  <span className="text-xs text-ink-muted/70">{label}</span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
