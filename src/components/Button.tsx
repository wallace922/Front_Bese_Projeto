import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]',
  secondary:
    'bg-black/60 hover:bg-black/80 text-gray-200 font-semibold border border-white/20 backdrop-blur-sm',
  danger:
    'bg-red-800 hover:bg-red-700 text-gray-100 font-semibold border border-red-600',
  ghost:
    'bg-transparent hover:bg-black/40 text-amber-400 font-semibold border border-white/20 hover:border-amber-500 backdrop-blur-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-md',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-150 tracking-wide',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
