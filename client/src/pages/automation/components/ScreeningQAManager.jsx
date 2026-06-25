import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../../api/axiosInstance.js';
import { Trash2, RefreshCw, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';

const TYPE_COLOR = {
  text:     'gray',  textarea: 'gray',
  number:   'blue',  radio:    'purple',
  dropdown: 'indigo', checkbox: 'teal',
};

export default function ScreeningQAManager({ source = 'naukri' }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/automation/qa', {
        params: { source, page: p, limit: LIMIT },
      });
      setItems(data.data.items);
      setTotal(data.data.pagination.total);
      setPage(p);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, [source]);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stored answer? The bot will ask you this question again next time.')) return;
    setDeleting(id);
    try {
      await axiosInstance.delete(`/automation/qa/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
      setTotal((t) => t - 1);
    } catch { /* handled by interceptor */ }
    finally { setDeleting(null); }
  };

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-primary-600" />
          <div>
            <h3 className="font-semibold text-ink">Learned Screening Answers</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Questions the bot has learned to answer automatically. Delete an entry to re-prompt next time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted/70">{total} stored</span>
          <button
            type="button"
            onClick={() => load(page)}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-elevated-2 text-ink-muted"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        {loading && !items.length ? (
          <div className="flex items-center justify-center py-10 text-ink-muted gap-2 text-sm">
            <RefreshCw size={14} className="animate-spin" /> Loading…
          </div>
        ) : !items.length ? (
          <p className="text-center text-sm text-ink-muted/70 py-10">
            No answers learned yet. Run an automation session — the bot will save answers as it goes.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item._id}>
                <div
                  className="flex items-center gap-3 px-5 py-3 hover:bg-elevated-2/70 cursor-pointer"
                  onClick={() => toggleExpand(item._id)}
                >
                  {/* Field type badge */}
                  <Badge variant={TYPE_COLOR[item.questionType] || 'gray'} className="shrink-0 text-xs capitalize">
                    {item.questionType}
                  </Badge>

                  {/* Question text */}
                  <p className="flex-1 text-sm text-ink truncate">{item.questionText}</p>

                  {/* Usage count */}
                  <span className="text-xs text-ink-muted/70 shrink-0">
                    used {item.usageCount}×
                  </span>

                  {/* Expand icon */}
                  <span className="text-ink-muted">
                    {expanded === item._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                    disabled={deleting === item._id}
                    className="p-1 text-ink-muted hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete this answer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded: options preview */}
                {expanded === item._id && item.options?.length > 0 && (
                  <div className="px-5 pb-3 bg-elevated-2/60 border-t border-line">
                    <p className="text-xs text-ink-muted mt-2 mb-1">Available options when learned:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.options.map((opt) => (
                        <span key={opt} className="text-xs px-2 py-0.5 bg-elevated border border-line rounded-full text-ink">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card.Body>

      {/* Pagination */}
      {total > LIMIT && (
        <Card.Footer className="flex items-center justify-between text-xs text-ink-muted">
          <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load(page - 1)}
              disabled={page === 1 || loading}
              className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => load(page + 1)}
              disabled={page * LIMIT >= total || loading}
              className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
}
