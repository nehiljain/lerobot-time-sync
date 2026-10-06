import type { CSSProperties, ReactNode } from 'react';

type Option<T extends string> = { value: T; label: ReactNode };

/** A radio group drawn as a segmented control. Arrow keys move the selection. */
export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  const idx = options.findIndex((o) => o.value === value);
  return (
    <div
      className="seg"
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
        onChange(options[next].value);
        const btns = (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button');
        btns[next]?.focus();
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="seg__btn"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__track" aria-hidden="true" />
      <span>
        {children}
        {hint && <span className="switch__hint">{hint}</span>}
      </span>
    </button>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
  style,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
  style?: CSSProperties;
}) {
  return (
    <label className="range" style={style}>
      <span className="range__top">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export const IconReplay = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.2 6a3.8 3.8 0 1 0 1.1-2.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M2.4 1.4v2.4h2.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPlay = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
  </svg>
);

export const IconPause = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" />
  </svg>
);

export const IconTarget = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="6" cy="6" r="1.4" fill="currentColor" />
  </svg>
);
