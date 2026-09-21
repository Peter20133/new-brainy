import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrainVisual({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: { box: 'h-10 w-10', icon: 20, spark: 12 },
    md: { box: 'h-16 w-16', icon: 32, spark: 16 },
    lg: { box: 'h-24 w-24', icon: 48, spark: 20 },
  };
  const s = sizes[size];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <div className={cn('flex items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft ring-1 ring-brand-700/20', s.box)}>
        <Brain size={s.icon} strokeWidth={1.75} />
      </div>
      <Sparkles size={s.spark} className="absolute -right-1 -top-1 text-amber-400" />
    </div>
  );
}

