'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { NewspaperCode } from '@/lib/types';
import { NEWSPAPERS_META, cn } from '@/lib/utils';

export type NewspaperFilter = NewspaperCode | 'ALL';

interface NewspaperFilterContextType {
  selectedPaper: NewspaperFilter;
  setSelectedPaper: (paper: NewspaperFilter) => void;
}

const NewspaperFilterContext = createContext<NewspaperFilterContextType>({
  selectedPaper: 'ALL',
  setSelectedPaper: () => {},
});

export function NewspaperFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedPaper, setSelectedPaperState] = useState<NewspaperFilter>('ALL');

  useEffect(() => {
    const saved = localStorage.getItem('hindu-active-paper') as NewspaperFilter;
    if (saved && (saved === 'ALL' || saved in NEWSPAPERS_META)) {
      setSelectedPaperState(saved);
    }
  }, []);

  const setSelectedPaper = (paper: NewspaperFilter) => {
    localStorage.setItem('hindu-active-paper', paper);
    setSelectedPaperState(paper);
  };

  return (
    <NewspaperFilterContext.Provider value={{ selectedPaper, setSelectedPaper }}>
      {children}
    </NewspaperFilterContext.Provider>
  );
}

export function useNewspaperFilter() {
  return useContext(NewspaperFilterContext);
}

export default function NewspaperFilterPills({ className }: { className?: string }) {
  const { selectedPaper, setSelectedPaper } = useNewspaperFilter();

  const options: Array<{ code: NewspaperFilter; label: string; short: string }> = [
    { code: 'ALL', label: 'All 4 Papers', short: 'ALL' },
    { code: 'DINAKARAN', label: 'Dinakaran', short: 'DK' },
    { code: 'DINAMALAR', label: 'Dinamalar', short: 'DM' },
    { code: 'NIE_DIN', label: 'NIE / DIN', short: 'ND' },
    { code: 'THE_HINDU', label: 'The Hindu', short: 'TH' },
  ];

  return (
    <div className={cn('flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1', className)}>
      {options.map((opt) => {
        const isSelected = selectedPaper === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setSelectedPaper(opt.code)}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap',
              isSelected
                ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                : 'bg-white/80 dark:bg-purple-950/40 border-gray-200 dark:border-purple-900/60 text-gray-700 dark:text-purple-200 hover:border-purple-400'
            )}
          >
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
}
