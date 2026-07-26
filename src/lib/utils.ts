export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCNPJ(cnpj: string | number): string {
  if (!cnpj) return '';
  const digits = String(cnpj).replace(/\D/g, '');
  if (digits.length !== 14) return String(cnpj);
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function toInputDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

export function toApiDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Converte valor monetário no formato brasileiro para number.
 * Suporta: "1.500,30" → 1500.30, "1500,30" → 1500.30, "1500.30" → 1500.30, "1500" → 1500
 *
 * Regra: se há vírgula → ponto é separador de milhar, vírgula é decimal.
 *        se não há vírgula → ponto é decimal (formato EN ou valor inteiro).
 */
export function parseBRCurrency(raw: string): number {
  const s = raw.replace(/R\$\s?/g, '').trim();
  if (!s) return NaN;
  if (s.includes(',')) {
    // Formato BR: remove pontos de milhar, troca vírgula por ponto decimal
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // Sem vírgula: ponto é decimal (ou valor inteiro)
  return parseFloat(s);
}

/**
 * Aplica máscara DD/MM/YYYY enquanto o usuário digita ou cola.
 * Aceita qualquer separador (/, -, espaço) na entrada.
 */
export function applyDateMask(raw: string): string {
  // Extrai apenas dígitos
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
