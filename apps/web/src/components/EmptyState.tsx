import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-16 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
      {icon && (
        <div className="mb-5 flex h-18 w-18 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-text-accent">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold text-white font-display">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}