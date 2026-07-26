import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = '',
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-widest text-stone-400"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'bg-black/60 border text-gray-200 text-sm rounded-md px-3 py-2',
          'placeholder-stone-500 focus:outline-none focus:ring-2 transition-all duration-150',
          error
            ? 'border-red-600 focus:ring-red-500/40'
            : 'border-white/20 focus:border-amber-500 focus:ring-amber-500/30',
          className,
        ].join(' ')}
        {...rest}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
