import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_36%),radial-gradient(circle_at_top_right,rgba(139,124,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_center,rgba(255,139,209,0.08),transparent_34%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-text-accent/80">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-display">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
              {description}
            </p>
          )}
          {meta && <div className="mt-5 flex flex-wrap gap-2">{meta}</div>}
        </div>
        {actions && <div className="relative z-10 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}