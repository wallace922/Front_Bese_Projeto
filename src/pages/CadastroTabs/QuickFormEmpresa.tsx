import { useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { saveEmpresa } from '../../services/api';
import type { EmpresaDto } from '../../types';
import { formatCNPJ } from '../../lib/utils';

function applyCnpjMask(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export default function QuickFormEmpresa() {
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EmpresaDto | null>(null);

  function handleCnpj(v: string) {
    setCnpj(applyCnpjMask(v));
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    const rawCnpj = cnpj.replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      setError('CNPJ inválido. Deve conter 14 dígitos.');
      return;
    }
    if (!nome.trim()) {
      setError('Informe o nome da empresa.');
      return;
    }
    setLoading(true);
    const dto: EmpresaDto = { nome: nome.trim(), cnpj: rawCnpj };
    const result = await saveEmpresa(dto);
    if (result.data) {
      setSuccess(result.data);
      setCnpj('');
      setNome('');
    } else {
      setError(result.errorMessage ?? 'Erro ao salvar empresa.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
        <span className="text-amber-500 mr-2">▶</span>Empresa Rápida
      </p>

      <div className="grid grid-cols-1 gap-3">
        <Input
          label="CNPJ"
          placeholder="XX.XXX.XXX/XXXX-XX"
          value={cnpj}
          onChange={(e) => handleCnpj(e.target.value)}
          maxLength={18}
        />
        <Input
          label="Nome da Empresa"
          placeholder="Razão Social"
          value={nome}
          onChange={(e) => { setNome(e.target.value); setSuccess(null); }}
        />
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {success && (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs animate-fadeIn">
          <p className="text-emerald-400 font-bold mb-0.5">✔ Empresa cadastrada</p>
          <p className="text-stone-400 font-mono">{formatCNPJ(success.cnpj)} — {success.nome}</p>
        </div>
      )}

      <Button variant="primary" size="sm" loading={loading} onClick={handleSave} className="w-full">
        Cadastrar Empresa
      </Button>
    </div>
  );
}
