type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        {label && <span className="text-zinc-400">{label}</span>}

        <span className="ml-auto font-medium text-zinc-300">{safeValue}%</span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-label={label ?? "Progreso"}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-300"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}
