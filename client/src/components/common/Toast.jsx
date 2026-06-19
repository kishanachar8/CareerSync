import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearToast } from '../../features/ui/uiSlice.js';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const CONFIG = {
  success: {
    icon:    CheckCircle2,
    bar:     'bg-emerald-500',
    wrap:    'bg-white border-l-4 border-emerald-500',
    icon_cl: 'text-emerald-500',
  },
  error: {
    icon:    XCircle,
    bar:     'bg-rose-500',
    wrap:    'bg-white border-l-4 border-rose-500',
    icon_cl: 'text-rose-500',
  },
  warning: {
    icon:    AlertTriangle,
    bar:     'bg-amber-500',
    wrap:    'bg-white border-l-4 border-amber-500',
    icon_cl: 'text-amber-500',
  },
  info: {
    icon:    Info,
    bar:     'bg-primary-500',
    wrap:    'bg-white border-l-4 border-primary-500',
    icon_cl: 'text-primary-500',
  },
};

const DURATION = 4000;

const Toast = () => {
  const dispatch = useDispatch();
  const toast    = useSelector((s) => s.ui.toast);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) return;

    setProgress(100);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
    }, 30);

    const timer = setTimeout(() => dispatch(clearToast()), DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [toast, dispatch]);

  if (!toast) return null;

  const { type = 'info' } = toast;
  const cfg  = CONFIG[type] || CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-[200] w-80 rounded-xl shadow-xl overflow-hidden animate-slide-up ${cfg.wrap}`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.icon_cl}`} />
        <p className="flex-1 text-sm font-medium text-gray-800 leading-snug">{toast.message}</p>
        <button
          onClick={() => dispatch(clearToast())}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors -mt-0.5 -mr-1 p-0.5 rounded"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100">
        <div
          className={`h-full ${cfg.bar} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;
