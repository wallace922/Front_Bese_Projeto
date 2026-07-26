import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export default function Select({
  label,
  error,
  options,
  className = '',
  id,
  ...rest
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-widest text-stone-400"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[
          'bg-black/60 border text-gray-200 text-sm rounded-md px-3 py-2',
          'focus:outline-none focus:ring-2 transition-all duration-150',
          error
            ? 'border-red-600 focus:ring-red-500/40'
            : 'border-white/20 focus:border-amber-500 focus:ring-amber-500/30',
          className,
        ].join(' ')}
        {...rest}
      >
        <option value="" disabled>Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
