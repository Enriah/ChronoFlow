import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export function ToggleSwitch({ checked, onCheckedChange, disabled = false, label, description, className }: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return <div className={clsx('flex items-center justify-between gap-3', disabled && 'opacity-50', className)}>
    {(label || description) && <div className="min-w-0"><div className="text-sm font-medium">{label}</div>{description && <div className="mt-0.5 text-xs text-text-secondary">{description}</div>}</div>}
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange(!checked)} className={clsx('relative h-6 w-11 shrink-0 overflow-hidden rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50', checked ? 'border-primary bg-primary' : 'border-border bg-surface-hover', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <span className={clsx('pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', checked ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  </div>;
}
