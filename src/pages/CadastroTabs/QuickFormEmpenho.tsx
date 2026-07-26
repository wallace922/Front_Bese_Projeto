import { useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { saveEmpenho } from '../../services/api';
import type { EmpenhoDto } from '../../types';

export default function QuickFormEmpenho() {
  const [numero, setNumero] = useState('');
  const [ano, setAno] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EmpenhoDto | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!numero || !ano) {
      setError('Informe o Nº do Empenho e o Ano.');
      return;
    }
    setLoading(true);
    // Backend aceita payload mínimo (numero + ano); demais campos completados depois
    const dto = {
      numero: parseInt(numero, 10),
      ano: parseInt(ano, 10),
    } as EmpenhoDto;
    const result = await saveEmpenho(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumero('');
      setAno('');
    } else {
      setError(result.errorMessage ?? 'Erro ao salvar empenho.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
        <span className="text-amber-500 mr-2">▶</span>Empenho Rápido
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nº Empenho"
          type="number"
          placeholder="12345"
          value={numero}
          onChange={(e) => { setNumero(e.target.value); setSuccess(null); }}
        />
        <Input
          label="Ano"
          type="number"
          placeholder="2024"
          value={ano}
          onChange={(e) => { setAno(e.target.value); setSuccess(null); }}
        />
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {success && (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs animate-fadeIn">
          <p className="text-emerald-400 font-bold mb-0.5">✔ Empenho cadastrado</p>
          <p className="text-stone-400 font-mono">
            Nº <span className="text-amber-400">{success.numero}</span> / {success.ano}
          </p>
          <p className="text-stone-600 mt-0.5">Complete os demais dados pela tela de Empenho.</p>
        </div>
      )}

      <Button variant="primary" size="sm" loading={loading} onClick={handleSave} className="w-full">
        Cadastrar Empenho
      </Button>
    </div>
  );
}
