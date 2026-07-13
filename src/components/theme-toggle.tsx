import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Tema claro' : 'Tema oscuro';

  return (
    <Button
      aria-label={label}
      className={cn('justify-start gap-2', className)}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size={showLabel ? 'default' : 'icon'}
      title={label}
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
