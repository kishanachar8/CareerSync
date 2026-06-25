import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchApplications, updateApplication } from '../../../features/applications/applicationsSlice.js';
import { ExternalLink, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';

const STATUS_LABEL = {
  pending_manual: { label: 'Awaiting You',   color: 'amber' },
  applied:        { label: 'Marked Done',     color: 'green' },
  rejected:       { label: 'Rejected',        color: 'red'   },
};

export default function ManualApplyQueue() {
  const dispatch    = useDispatch();
  const { items, status } = useSelector((s) => s.applications);
  const [marking, setMarking] = useState(null);

  // Only show company-site jobs
  const queue = useMemo(() => (items || []).filter((a) => a.manualApply === true), [items]);
  const pendingCount = useMemo(
    () => queue.filter((a) => a.status === 'pending_manual').length,
    [queue],
  );

  useEffect(() => {
    dispatch(fetchApplications({ manualApply: true }));
  }, [dispatch]);

  const markDone = async (appId) => {
    setMarking(appId);
    await dispatch(updateApplication({ id: appId, data: { status: 'applied' } }));
    setMarking(null);
  };

  if (status === 'loading' && !queue.length) {
    return (
      <Card>
        <Card.Body className="flex items-center justify-center py-10 text-ink-muted gap-2">
          <RefreshCw size={16} className="animate-spin" /> Loading…
        </Card.Body>
      </Card>
    );
  }

  if (!queue.length) {
    return (
      <Card>
        <Card.Body className="py-10 text-center text-sm text-ink-muted/70">
          No company-site jobs queued. Auto-applied jobs that required manual completion will appear here.
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink">Manual Apply Queue</h3>
          <p className="text-xs text-ink-muted mt-0.5">
            These jobs redirect to the company's own portal — apply there, then mark done.
          </p>
        </div>
        <Badge variant="warning">{pendingCount} pending</Badge>
      </Card.Header>

      <Card.Body className="divide-y divide-line p-0">
        {queue.map((app) => {
          const job        = app.jobId || {};
          const statusInfo = STATUS_LABEL[app.status] || { label: app.status, color: 'gray' };
          const isPending  = app.status === 'pending_manual';

          return (
            <div key={app._id} className="flex items-center gap-4 px-5 py-4 hover:bg-elevated-2/60">
              {/* Status icon */}
              <div className="shrink-0">
                {isPending
                  ? <Clock size={18} className="text-amber-500" />
                  : <CheckCircle2 size={18} className="text-green-500" />
                }
              </div>

              {/* Job info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink text-sm truncate">
                  {job.title || 'Untitled job'}
                </p>
                <p className="text-xs text-ink-muted truncate">{job.company || '—'}</p>
              </div>

              {/* Status badge */}
              <Badge variant={statusInfo.color} className="shrink-0 text-xs">
                {statusInfo.label}
              </Badge>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {app.companyApplyUrl && (
                  <a
                    href={app.companyApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Open <ExternalLink size={12} />
                  </a>
                )}

                {isPending && (
                  <button
                    type="button"
                    onClick={() => markDone(app._id)}
                    disabled={marking === app._id}
                    className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 transition-colors"
                  >
                    {marking === app._id ? 'Saving…' : 'Mark Done'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card.Body>

      <Card.Footer className="text-xs text-ink-muted/70">
        <AlertCircle size={11} className="inline mr-1" />
        Every company portal is different — the bot cannot auto-apply there. Apply manually, then click "Mark Done" to track it.
      </Card.Footer>
    </Card>
  );
}
