import type { ReactNode } from "react";

const inputBase =
  "w-full rounded-xl border border-gold/20 bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25";

export function Field({
  label,
  htmlFor,
  required,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-emerald-deep"
      >
        {label}
        {required && <span className="ml-0.5 text-gold-dark">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({
  id,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input id={id} type={type} className={inputBase} {...props} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return <textarea className={`${inputBase} min-h-[96px] resize-y`} {...props} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  id,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gold/15 bg-cream px-3.5 py-2.5 text-sm text-emerald-deep transition-colors hover:border-gold/40"
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-emerald-deep"
        {...props}
      />
      {label}
    </label>
  );
}
