'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    if (theme === 'dark') return <Moon className="w-4 h-4 text-purple-400" />;
    return <Laptop className="w-4 h-4 text-blue-400" />;
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <div className="p-2">
      <button
        type="button"
        suppressHydrationWarning
        onClick={cycleTheme}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-200 hover:text-white hover:bg-white/10 transition-colors',
          collapsed && 'justify-center px-2'
        )}
        title={`Current theme: ${getLabel()} (Click to change)`}
      >
        {getIcon()}
        {!collapsed && <span suppressHydrationWarning>Theme: {getLabel()}</span>}
      </button>
    </div>
  );
}
