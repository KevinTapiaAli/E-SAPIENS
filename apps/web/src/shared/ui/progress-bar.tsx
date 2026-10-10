type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        {label && <span className="text-muted">{label}</span>}

        <span className="ml-auto font-medium text-ink">{safeValue}%</span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-label={label ?? "Progreso"}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-150"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}
