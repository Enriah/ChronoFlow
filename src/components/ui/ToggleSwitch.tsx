import { clsx } from 'clsx';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: ToggleSwitchProps) {
  return (
    <label
      onClick={() => {
        if (!disabled) onChange();
      }}
      className={clsx(
        'flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-surface/45 px-4 py-3 transition-colors',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/35 hover:bg-surface-hover/50',
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-text">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-text-secondary">{description}</span>
        )}
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) onChange();
        }}
        disabled={disabled}
        className={clsx(
          'relative h-6 w-12 shrink-0 rounded-full border transition-all',
          checked ? 'border-primary bg-primary' : 'border-border bg-surface-hover'
        )}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={clsx(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  );
}
