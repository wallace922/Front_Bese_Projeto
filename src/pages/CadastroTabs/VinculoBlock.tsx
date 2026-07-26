import { useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import {
  findNpByNumeroEAno,
  findEmpenhoByNumeroEAno,
  savePaymentEmpenho,
} from '../../services/api';
import type { PaymentNoteEmpenhoDto } from '../../types';
import { parseBRCurrency } from '../../lib/utils';

export default function VinculoBlock() {
  const [np, setNp] = useState('');
  const [npAno, setNpAno] = useState('');
  const [empenho, setEmpenho] = useState('');
  const [empenhoAno, setEmpenhoAno] = useState('');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(null);

    const npNum = parseInt(np, 10);
    const npAnoNum = parseInt(npAno, 10);
    const empNum = parseInt(empenho, 10);
    const empAno = parseInt(empenhoAno, 10);
    const vinculoValor = parseBRCurrency(valor);

    if (!npNum || !npAnoNum || !empNum || !empAno || isNaN(vinculoValor)) {
      setError('Preencha todos os campos: Nº NP, Ano NP, Nº Empenho, Ano Empenho e Valor Vínculo (ex: 1.500,30).');
      return;
    }

    setLoading(true);

    const [npResult, empResult] = await Promise.all([
      findNpByNumeroEAno(npNum, npAnoNum),
      findEmpenhoByNumeroEAno(empNum, empAno),
    ]);

    const erros: string[] = [];
    if (!npResult.data) erros.push(`NP nº ${npNum}/${npAnoNum} (${npResult.errorMessage})`);
    if (!empResult.data) erros.push(`Empenho nº ${empNum}/${empAno} (${empResult.errorMessage})`);

    if (erros.length > 0) {
      setError(`Não encontrado(s):\n• ${erros.join('\n• ')}`);
      setLoading(false);
      return;
    }

    const dto: PaymentNoteEmpenhoDto = {
      empenhoDto: empResult.data!,
      paymentNoteBasicDto: npResult.data!,
      financialPlanningBasicDto: null,
      value: vinculoValor,
    };

    const saveResult = await savePaymentEmpenho(dto);
    if (saveResult.data) {
      setNp('');
      setNpAno('');
      setEmpenho('');
      setEmpenhoAno('');
      setValor('');
      setSuccess('Vínculo criado com sucesso! Acesse o Dashboard para visualizar.');
    } else {
      setError(saveResult.errorMessage ?? 'Erro ao salvar o vínculo.');
    }
    setLoading(false);
  }

  return (
    <div className="glass-panel p-5 space-y-4">
      <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
        <span className="text-amber-500 mr-2">▶</span>Criar Vínculo — PaymentNote × Empenho
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Nº NP"
          type="number"
          placeholder="Ex: 2024001"
          value={np}
          onChange={(e) => setNp(e.target.value)}
          className="w-full sm:w-36"
        />
        <Input
          label="Ano NP"
          type="number"
          placeholder="Ex: 2024"
          value={npAno}
          onChange={(e) => setNpAno(e.target.value)}
          className="w-full sm:w-28"
        />
        <Input
          label="Nº Empenho"
          type="number"
          placeholder="Ex: 12345"
          value={empenho}
          onChange={(e) => setEmpenho(e.target.value)}
          className="w-full sm:w-36"
        />
        <Input
          label="Ano Empenho"
          type="number"
          placeholder="Ex: 2024"
          value={empenhoAno}
          onChange={(e) => setEmpenhoAno(e.target.value)}
          className="w-full sm:w-28"
        />
        <Input
          label="Valor Vínculo"
          type="text"
          inputMode="decimal"
          placeholder="Ex: 1.500,30"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full sm:w-36"
        />
        <Button
          variant="primary"
          size="md"
          loading={loading}
          onClick={handleSave}
          className="mb-0.5 w-full sm:w-auto"
        >
          Salvar Vínculo
        </Button>
      </div>

      <div className="space-y-2">
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
      </div>
    </div>
  );
}
