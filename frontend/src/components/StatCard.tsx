import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'teal' | 'coral' | 'mint' | 'crimson' | 'slate';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'teal',
  trend,
}) => {
  const variantStyles = {
    teal: {
      bg: 'bg-gradient-to-br from-teal-50 to-white',
      border: 'border-teal-100',
      iconBg: 'bg-pharmacy-teal-100 text-pharmacy-teal-700',
      valueColor: 'text-pharmacy-teal-900',
    },
    mint: {
      bg: 'bg-gradient-to-br from-emerald-50 to-white',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-700',
      valueColor: 'text-emerald-950',
    },
    coral: {
      bg: 'bg-gradient-to-br from-rose-50 to-white',
      border: 'border-rose-100',
      iconBg: 'bg-pharmacy-coral-100 text-pharmacy-coral-600',
      valueColor: 'text-rose-950',
    },
    crimson: {
      bg: 'bg-gradient-to-br from-red-50 to-white',
      border: 'border-red-100',
      iconBg: 'bg-red-100 text-red-600',
      valueColor: 'text-red-950',
    },
    slate: {
      bg: 'bg-gradient-to-br from-slate-50 to-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className={`p-5 rounded-2xl border ${style.border} ${style.bg} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <h3 className={`text-2xl font-bold tracking-tight ${style.valueColor}`}>{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <span className="inline-block mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {trend}
            </span>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${style.iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
