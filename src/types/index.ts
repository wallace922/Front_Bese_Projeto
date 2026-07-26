// ── Shared ────────────────────────────────────────────────────────────────────

export type OptanteStatus = 'OPTANTE' | 'NAO_OPTANTE';
export type TaxStatus = 'CALCULATED' | 'PENDING' | 'EXEMPT';

// ── Empenho ───────────────────────────────────────────────────────────────────

export interface EmpenhoDto {
  id?: number;
  numero: number;
  ano: number;
  /** Opcional no backend — pode ser null em registros antigos. */
  fontDeOrigin?: number;
  internalPlan: string;
  nature: number;
}

// ── Empresa ───────────────────────────────────────────────────────────────────

export interface EmpresaDto {
  id?: number;
  nome: string;
  cnpj: string;
}

// ── Financial Planning ────────────────────────────────────────────────────────

/** Corresponde a FinancialPlanningBasicDto no backend. */
export interface FinancialPlanningDto {
  id?: number;
  numero: number;
  data: string;
  vinculation: number;
  origin: number;
}

// ── Tax ───────────────────────────────────────────────────────────────────────

/**
 * Item calculado de imposto — retornado pelo backend após POST/PUT/GET.
 * A lista é dinâmica: pode conter qualquer tipo (IR, CSLL, COFINS, etc.)
 * dependendo da TaxRule associada ao codEfd.
 */
export interface TaxCalculatedItem {
  taxType: string;   // "IR", "CSLL", "COFINS", "PIS_PASEP", "DARF", etc.
  rate: number;      // alíquota decimal (ex: 0.012 = 1,2%)
  amount: number;    // valor calculado (ex: 120.00)
}

/**
 * TaxDto — estrutura da tributação de um PaymentNoteItem.
 *
 * No POST/PUT padrão, apenas `tipo` e `codEfd` são enviados e o backend
 * calcula os impostos automaticamente.
 *
 * Modo de ajuste manual: quando `manualAdjustment: true` é enviado, o
 * backend ignora o cálculo automático e persiste os valores de `calculatedItems`
 * exatamente como enviados pelo frontend.
 */
export interface TaxDto {
  id?: number;
  tipo: OptanteStatus;
  codEfd: number | null;
  /**
   * Código de receita — lido da resposta do backend E enviado quando o EFD
   * possui múltiplos códigos de receita vigentes (seleção obrigatória pelo usuário).
   */
  codigoReceita?: number | null;
  /**
   * Descrição legível da TaxRule vigente no momento do cálculo.
   * Campo somente-leitura (read-only) — não deve ser enviado em POST/PUT.
   * Pode ser null para notas antigas ou com status PENDING/EXEMPT.
   */
  taxRuleDescription?: string | null;
  taxStatus?: TaxStatus;
  calculatedItems?: TaxCalculatedItem[];
  /**
   * Flag de ajuste manual de impostos.
   * Quando true, o backend salva os `calculatedItems` enviados sem recalcular.
   * Usado para corrigir divergências de arredondamento de 1 centavo.
   */
  manualAdjustment?: boolean;
}

// ── Payment Note Item ─────────────────────────────────────────────────────────

/**
 * PaymentNoteItemDto — item de uma Nota de Pagamento.
 * Cada item tem seu próprio valor, descrição e tributação.
 * Corresponde a PaymentNoteItemDto no backend.
 */
export interface PaymentNoteItemDto {
  id?: number;
  description?: string;
  value: number;
  tax: TaxDto;
  manualAdjustment?: boolean;
  /**
   * Empresa beneficiária do imposto retido neste item.
   * Opcional — se null/undefined, o backend herda a empresa da própria NP.
   */
  empresaBeneficiaria?: EmpresaDto | null;
}

// ── Payment Note ──────────────────────────────────────────────────────────────

/**
 * PaymentNoteBasicDto — corresponde a PaymentNoteBasicDto no backend.
 *
 * ATENÇÃO: a partir do refactoring do backend, o campo `tax` foi removido
 * do nível da NP e agora está em cada `PaymentNoteItemDto`.
 * O campo `value` na NP é calculado pelo backend como soma dos itens.
 */
export interface PaymentNoteDto {
  id?: number;
  numeroNp: number;
  dataLiquidacao: string;
  empresa: EmpresaDto;
  docOrigin: string;
  /** Valor total calculado pelo backend como soma dos itens. Somente leitura. */
  value?: number;
  status: 'CANCELADA' | 'PAGA' | 'A_PAGAR';
  /** Lista de itens — cada um com seu próprio valor e tributação. */
  items: PaymentNoteItemDto[];
  /**
   * Data de pagamento efetivo — somente preenchido quando status === 'PAGA'.
   * O backend zera automaticamente se o status mudar para outro valor.
   * Formato: dd/MM/yyyy (retorno da API) ou yyyy-MM-dd (input HTML).
   */
  datePayment?: string | null;
}

// ── PaymentNote + Empenho (vínculo principal) ─────────────────────────────────

/** Corresponde a PaymentNoteEmpenhoBasicDto no backend. */
export interface PaymentNoteEmpenhoDto {
  id?: number;
  paymentNoteBasicDto: PaymentNoteDto;
  empenhoDto: EmpenhoDto;
  financialPlanningBasicDto: FinancialPlanningDto | null;
  value: number;
}

// ── PaymentNote para relatório por mês/ano ────────────────────────────────────

/**
 * PaymentNoteVinculacaoDto — retornado por GET /API/PaymentEmpenho/por-mes-ano
 * Contém os campos principais da NP mais o campo `vinculation` do PF e items[].
 * Corresponde a PaymentNoteVinculacaoDto no backend.
 */
export interface PaymentNoteVinculacaoDto {
  id: number;
  numeroNp: number;
  dataLiquidacao: string;
  empresa: EmpresaDto;
  docOrigin: string;
  value: number;
  status: 'CANCELADA' | 'PAGA' | 'A_PAGAR';
  vinculation: number;
  /** Items com tributação por item — substitui o campo tax do nível da NP. */
  items?: PaymentNoteItemDto[];
}

/**
 * PaymentNoteEmpenhoBasicDto — retornado por GET /API/PaymentEmpenho/sem-planejamento
 * e GET /API/PaymentEmpenho (lista geral).
 *
 * ATENÇÃO: os nomes das propriedades batem exatamente com o backend Java:
 *   paymentNoteBasicDto, empenhoDto, financialPlanningBasicDto
 */
export interface PaymentNoteEmpenhoBasicDto {
  id: number;
  paymentNoteBasicDto: PaymentNoteDto;
  empenhoDto: EmpenhoDto;
  financialPlanningBasicDto: FinancialPlanningDto | null;
  value: number;
}

// ── Tax Rule ──────────────────────────────────────────────────────────────────

/**
 * Item de uma regra de imposto — define tipo e alíquota.
 * A lista é dinâmica: cada TaxRule pode ter um conjunto diferente de tipos.
 */
export interface TaxRuleItemDto {
  taxType: string;   // "IR", "CSLL", "COFINS", "PIS_PASEP", "DARF", ou qualquer outro
  rate: number;      // alíquota decimal (ex: 0.015 = 1,5%)
}

/**
 * TaxRule — regra de tributação cadastrada no sistema, versionada por datas de vigência.
 * Associada a PaymentNoteItem via codEfd.
 *
 * - POST /API/TaxRule → cria nova versão; encerra automaticamente a versão anterior em aberto.
 * - PUT /API/TaxRule/{id} → edita detalhes menores (description, items) sem criar nova versão.
 */
export interface TaxRuleDto {
  id?: number;
  codEfd: number;
  /** Código de agrupamento de receita — obrigatório. Agrupa diferentes codEfd sob uma mesma receita. */
  codigoReceita: number;
  /** Descrição da regra — suporta até 300 caracteres. */
  description: string;
  /** Data de início de vigência — obrigatório, formato dd/MM/yyyy */
  dataInicioVigencia: string;
  /** Data de fim de vigência — null significa "em vigor" */
  dataFimVigencia: string | null;
  items: TaxRuleItemDto[];
}

// ── Tax Rule Option (retornado por GET /API/TaxRule/opcoes) ───────────────────

/**
 * Opção de código de receita retornada pelo endpoint GET /API/TaxRule/opcoes.
 * Usado pelo NpItemEditor para listar as opções quando um EFD tem múltiplos
 * códigos de receita vigentes na data de liquidação da NP.
 */
export interface TaxRuleOption {
  id: number;
  codEfd: number;
  codigoReceita: number;
  description: string;
  dataInicioVigencia: string;
  dataFimVigencia: string | null;
  items: TaxRuleItemDto[];
}

// ── User ──────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'USER' | 'VIEWER';

export interface UserDto {
  id: number;
  name: string;
  cpf: string;
  role: Role;
}

export interface UserCreateDto {
  name: string;
  cpf: string;
  password: string;
  role: Role;
}

export interface UserUpdateDto {
  name: string;
  password?: string;
  role: Role;
}