import { useState } from 'react';
import { Bot } from 'lucide-react';
import NaukriSetup from './components/NaukriSetup.jsx';
import TriggerPanel from './components/TriggerPanel.jsx';
import RunHistory from './components/RunHistory.jsx';
import ScreeningQAManager from './components/ScreeningQAManager.jsx';

const Automation = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRunStarted = () => setRefreshTrigger((n) => n + 1);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot size={24} className="text-primary-600" />
          Job Automation
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Auto-apply to jobs on Naukri — a visible browser runs on your machine while you focus on interviews.
        </p>
      </div>

      {/* Warning banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
        <p className="font-medium">Before you start:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Keep your Naukri profile complete and up-to-date.</li>
          <li>The bot pauses at each apply step — answer any screening questions in the browser window.</li>
          <li>Use specific keywords (e.g. "React Developer" not "developer") for better matches.</li>
          <li>Start with 5–10 jobs to verify everything works before running larger batches.</li>
        </ul>
      </div>

      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Step 1 — Connect Naukri</p>
        <NaukriSetup />
      </section>

      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Step 2 — Run Auto-Apply</p>
        <TriggerPanel portal="naukri" onRunStarted={handleRunStarted} />
      </section>

      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Run History</p>
        <RunHistory portal="naukri" refreshTrigger={refreshTrigger} />
      </section>

      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Learned Screening Answers</p>
        <ScreeningQAManager source="naukri" />
      </section>
    </div>
  );
};

export default Automation;
