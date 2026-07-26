import React from 'react';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest text-stone-500 font-bold mb-4">
      <span className="text-amber-500 mr-2">▶</span>{children}
    </p>
  );
}

export function ReadField({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">{label}</label>
      <div className={`bg-stone-950 border border-white/10 text-sm rounded-md px-3 py-2 min-h-[2.25rem] ${
        highlight ? 'text-amber-300 font-bold' : 'text-gray-200 font-normal'
      }`}>
        {value !== '' && value !== undefined ? value : <span className="text-stone-600">—</span>}
      </div>
    </div>
  );
}

export function applyCnpjMask(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function TableContainer({ title, count, children }: { title?: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="glass-panel overflow-hidden animate-fadeIn">
      <div className="p-3 sm:p-5 overflow-x-auto">
        {title && <SectionTitle>{title}{count !== undefined ? ` (${count})` : ''}</SectionTitle>}
        {children}
      </div>
    </div>
  );
}
