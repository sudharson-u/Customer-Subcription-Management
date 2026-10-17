'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeSettingsSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Clean high-contrast theme for daytime circulation' },
    { value: 'dark', label: 'Deep Violet Dark', icon: Moon, desc: 'Calm night palette for reduced eye strain' },
    { value: 'system', label: 'System Default', icon: Laptop, desc: 'Follows device operating system preference' },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex flex-col items-start p-4 rounded-xl border text-left transition-all',
              isSelected
                ? 'border-purple-600 bg-purple-500/10 text-purple-900 dark:text-purple-200 ring-2 ring-purple-600/30'
                : 'border-gray-200 dark:border-[#2C185A] hover:border-purple-300 dark:hover:border-purple-800'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
              isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-purple-950/60 text-gray-600 dark:text-purple-300'
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{opt.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
