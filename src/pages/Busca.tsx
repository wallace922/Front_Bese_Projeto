import { useState } from 'react';
import PageShell from '../components/PageShell';
import Tabs, { Tab } from '../components/Tabs';

import BuscaEmpresa from './BuscaTabs/BuscaEmpresa';
import BuscaEmpenho from './BuscaTabs/BuscaEmpenho';
import BuscaFinancialPlanning from './BuscaTabs/BuscaFinancialPlanning';
import BuscaPaymentNote from './BuscaTabs/BuscaPaymentNote';
import BuscaTaxRule from './BuscaTabs/BuscaTaxRule';
import BuscaDarf from './BuscaTabs/BuscaDarf';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { key: 'empresa',           label: 'Empresa',            icon: '🏢' },
  { key: 'empenho',           label: 'Empenho',            icon: '📄' },
  { key: 'financialPlanning', label: 'Plan. Financeiro',   icon: '📊' },
  { key: 'paymentNote',       label: 'Nota de Pagamento',  icon: '💰' },
  { key: 'taxRule',           label: 'Regra de Imposto',   icon: '📋' },
  { key: 'darf',              label: 'Darf',               icon: '🧾' },
];

// ── Página principal ──────────────────────────────────────────────────────────

export default function Busca() {
  const [activeTab, setActiveTab] = useState('empresa');

  return (
    <PageShell>
      <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-2 glass-panel">
        <h2 className="text-amber-400 font-black uppercase tracking-widest text-sm mb-4">
          🔍 Busca
        </h2>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-3 sm:px-6 py-6">
        {activeTab === 'empresa'           && <BuscaEmpresa />}
        {activeTab === 'empenho'           && <BuscaEmpenho />}
        {activeTab === 'financialPlanning' && <BuscaFinancialPlanning />}
        {activeTab === 'paymentNote'       && <BuscaPaymentNote />}
        {activeTab === 'taxRule'           && <BuscaTaxRule />}
        {activeTab === 'darf'              && <BuscaDarf />}
      </div>
    </PageShell>
  );
}
