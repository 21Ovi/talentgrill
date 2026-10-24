// Plain module (not client-only) so server components can style links as buttons.

export type Variant = "primary" | "secondary" | "quiet";
export type Size = "lg" | "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90",
  secondary: "bg-surface text-ink ring-1 ring-line ring-inset hover:bg-sunken",
  quiet: "text-muted hover:text-ink",
};

const SIZES: Record<Size, string> = {
  lg: "h-14 px-6 text-[17px] gap-2.5",
  md: "h-12 px-5 text-base gap-2",
  sm: "h-9 px-3.5 text-sm gap-1.5",
};

/** Shared by buttons and links that look like buttons. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-[-0.01em]",
    "transition-[scale,background-color,opacity,box-shadow] duration-200 ease-out-soft",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(" ");
}
