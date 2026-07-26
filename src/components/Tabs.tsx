

export interface Tab {
  key: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap border-b border-stone-700">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={[
              'px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-150 border-b-2 -mb-px',
              isActive
                ? 'border-amber-500 text-amber-400 bg-stone-800/40'
                : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-500',
            ].join(' ')}
          >
            {tab.icon && <span className="mr-1 sm:mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
