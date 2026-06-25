/**
 * Controlled tab bar.
 *
 * Usage:
 *   const [tab, setTab] = useState('personal');
 *   <Tabs
 *     activeTab={tab}
 *     onChange={setTab}
 *     tabs={[
 *       { id: 'personal', label: 'Personal Info', icon: User },
 *       { id: 'skills',   label: 'Skills' },
 *     ]}
 *   />
 */
const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="border-b border-line">
    <nav className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium',
              'border-b-2 transition-colors focus:outline-none',
              active
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-line',
            ].join(' ')}
          >
            {Icon && <Icon size={15} />}
            {label}
          </button>
        );
      })}
    </nav>
  </div>
);

export default Tabs;
