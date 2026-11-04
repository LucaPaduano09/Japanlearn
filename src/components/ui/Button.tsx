import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/** Full-width call to action. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
