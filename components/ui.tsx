"use client";

import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { cue, setSoundEnabled, useSoundEnabled, type Cue } from "@/lib/feedback";
import { buttonClass, type Size, type Variant } from "./buttonClass";

export { buttonClass };

// ---- Buttons ---------------------------------------------------------------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Sound and haptic on press; null for none. */
  cue?: Cue | null;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  cue: pressCue = "tap",
  className = "",
  type = "button",
  disabled,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (pressCue) cue(pressCue);
        onClick?.(e);
      }}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="size-[1.1em] animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ---- Brand, surfaces, notices ----------------------------------------------

export function Brand() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.015em]">
      <span className="orb size-5" aria-hidden>
        <span className="orb-core" />
        <span className="orb-sheen" />
      </span>
      TalentGrill
    </span>
  );
}

/** A raised sheet. Reserved for the one thing on screen that needs grouping. */
export function Sheet({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section
      style={style}
      className={`rounded-[28px] bg-surface p-5 shadow-[var(--shadow-sheet)] ring-1 ring-line ring-inset sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

/** An inline problem with a fix. Plays the error cue once when it appears. */
export function Notice({ children }: { children: ReactNode }) {
  useEffect(() => cue("error"), []);
  return (
    <p role="alert" className="arrive rounded-2xl bg-danger/10 px-4 py-3 text-[15px] leading-snug text-danger">
      {children}
    </p>
  );
}

export function SoundToggle() {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!on);
        if (!on) cue("toggle");
      }}
      aria-pressed={on}
      aria-label={on ? "Turn sounds and vibration off" : "Turn sounds and vibration on"}
      className="flex size-10 items-center justify-center rounded-full text-muted transition-[scale,color] duration-200 ease-out-soft hover:text-ink active:scale-90"
    >
      {on ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
    </button>
  );
}

// ---- Segmented control -------------------------------------------------------

type Segment<T extends string> = { value: T; label: string; icon?: ReactNode };

const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** iOS-style segmented control: a thumb slides under the chosen option. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(i: number) {
    const next = options[(i + options.length) % options.length];
    if (next.value === value) return;
    cue("toggle");
    onChange(next.value);
    refs.current[(i + options.length) % options.length]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid rounded-full bg-sunken p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-[translate] duration-500 ease-spring"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, translate: `${index * 100}% 0` }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          disabled={disabled}
          onClick={() => select(i)}
          onKeyDown={(e) => {
            const step = ARROW_STEPS[e.key];
            if (!step) return;
            e.preventDefault();
            select(i + step);
          }}
          className={`relative z-10 flex h-10 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-colors duration-300 disabled:opacity-50 ${
            i === index ? "text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- The orb -----------------------------------------------------------------

export type OrbState = "idle" | "listening" | "thinking";

/**
 * The interviewer's presence. While listening, set `--level` (0 to 1) on the
 * element through `ref` from an animation frame; React never re-renders per frame.
 */
export function Orb({
  state = "idle",
  className = "",
  ref,
  children,
}: {
  state?: OrbState;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
  children?: ReactNode;
}) {
  return (
    <span ref={ref} data-state={state} className={`orb block ${className}`}>
      <span className="orb-glow" />
      <span className="orb-core" />
      <span className="orb-sheen" />
      {children && <span className="flex items-center justify-center text-white drop-shadow-[0_1px_6px_rgb(120_30_0/0.45)]">{children}</span>}
    </span>
  );
}
