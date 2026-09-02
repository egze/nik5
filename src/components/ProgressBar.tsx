interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
}

export function ProgressBar({ label, value, total }: ProgressBarProps) {
  const percentage = total === 0 ? 0 : Math.min(100, Math.max(0, (value / total) * 100));

  return (
    <div className="progress-bar">
      <p>{label}</p>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
