# Gestão de Tesouraria — Frontend

Interface web para o sistema de controle financeiro da Seção de Tesouraria, construída com **React 18 + TypeScript + Tailwind CSS** (via Vite), com integração direta ao back-end Spring Boot.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 |
| Linguagem | TypeScript (strict) |
| Build tool | Vite 5 |
| Estilização | Tailwind CSS |
| HTTP Client | Axios |
| Roteamento | React Router DOM |
| Estado | `useState` / `useEffect` nativos (sem gerenciador externo) |
| Back-end esperado | Spring Boot — `http://localhost:8080/API` |

---

## Pré-requisitos

- **Node.js** v18 ou superior
- **npm** v9 ou superior
- Back-end Spring Boot rodando em `http://localhost:8080`

---

## Instalação e Execução

```bash
# 1. Clone ou extraia o projeto
cd tesouraria-web

# 2. Instale as dependências
npm install

# 3. Rode em modo desenvolvimento
npm run dev
```

O Vite iniciará em **http://localhost:5173** com Hot Module Replacement (HMR) ativo.

```bash
# Gerar o build de produção
npm run build

# Visualizar o build localmente
npm run preview
```

---

## Arquitetura de Pastas

```
tesouraria-web/
├── index.html                       # Template HTML do Vite
├── vite.config.ts                   # Configuração do Vite + plugin React
├── tailwind.config.js               # Tema customizado (cores militares)
├── tsconfig.json                    # Configuração TypeScript principal
├── tsconfig.node.json               # Configuração TS para o Vite config
├── postcss.config.js                # PostCSS (necessário para Tailwind)
├── AGENTS.md                        # Convenções e padrões para agentes IA
└── src/
    ├── main.tsx                     # Entrypoint — monta o React no DOM
    ├── App.tsx                      # Componente raiz (rotas/navegação)
    ├── index.css                    # Diretivas Tailwind + .glass-panel + scrollbar
    │
    ├── types/
    │   └── index.ts                 # Interfaces DTO (contrato com o back-end)
    │
    ├── lib/
    │   └── utils.ts                 # Formatadores: moeda, CNPJ, data, toInputDate
    │
    ├── services/
    │   └── api.ts                   # Instância Axios + todas as funções HTTP
    │
    ├── hooks/
    │   └── useEntitySearch.ts       # Hook genérico para estado de busca/edição
    │
    ├── components/
    │   ├── Alert.tsx                # Feedback visual de sucesso/erro
    │   ├── Button.tsx               # Botão reutilizável (variants + loading)
    │   ├── EditIconButton.tsx       # Ícone ✏️ de edição nas tabelas
    │   ├── Input.tsx                # Input com label flutuante
    │   ├── PageShell.tsx            # Layout principal (header fixo + nav + brasão)
    │   ├── PaginationControls.tsx   # Controles de paginação (anterior/próxima)
    │   ├── SearchResultTable.tsx    # Tabela genérica de resultados
    │   ├── Select.tsx               # Select com label (obrigatório para enums)
    │   ├── Tabs.tsx                 # Navegação por abas
    │   ├── TaxItemsDisplay.tsx      # Exibição de impostos calculados (grid alinhado)
    │   └── TaxRuleItemEditor.tsx    # Editor de itens de regra de imposto
    │
    └── pages/
        ├── Busca.tsx                # Página principal de busca (abas)
        ├── BuscaTabs/
        │   ├── BuscaEmpresa.tsx             # Busca e edição por CNPJ
        │   ├── BuscaEmpenho.tsx             # Busca e edição por número + ano
        │   ├── BuscaFinancialPlanning.tsx   # Busca e edição por número + ano (PF)
        │   ├── BuscaPaymentNote.tsx         # Busca e edição de NP por número + ano
        │   ├── BuscaDarf.tsx                # Relatório DARF agrupado por código de receita
        │   ├── BuscaTaxRule.tsx             # Busca e edição de Regras de Imposto
        │   └── Shared.tsx                   # SectionTitle, ReadField, TableContainer
        ├── Cadastro.tsx             # Cadastro de Vínculo NP-Empenho
        ├── Dashboard.tsx            # Dashboard principal com vínculos e métricas
        └── PFNRDashboard.tsx        # Dashboard de vínculos sem Planejamento Financeiro
```

---

## Páginas do Sistema

### `Dashboard` (`/`)
Tela principal do sistema. Exibe todos os vínculos **NP–Empenho–PF** com:
- Métricas financeiras no topo (total registrado, pago, a pagar)
- Tabela paginada com layout accordion para detalhes (Empresa, Impostos calculados)
- Formulário de cadastro rápido de vínculo embutido na página
- Edição inline de qualquer vínculo diretamente na tabela

### `PFNRDashboard` (`/pfnr`)
Painel de vínculos **sem Planejamento Financeiro** associado. Exibe:
- Lista de PaymentNoteEmpenho sem PF
- Permite associar um PF existente a cada vínculo

### `Cadastro` (`/cadastro`)
Tela de criação de vínculo **PaymentNoteEmpenho**. O cadastro:
1. Busca a NP pelo número + ano
2. Busca o Empenho pelo número + ano
3. Opcionalmente associa um PF pelo número + ano
4. Envia o vínculo via POST

### `Busca` (`/busca`)
Página de busca unificada com as seguintes abas:

| Aba | Arquivo | Função |
|-----|---------|--------|
| Empresa | `BuscaEmpresa.tsx` | Busca/edição de empresas/credores por CNPJ |
| Empenho | `BuscaEmpenho.tsx` | Busca/edição de empenhos por nº + ano |
| Planejamento Financeiro | `BuscaFinancialPlanning.tsx` | Busca/edição de PF por nº + ano |
| Nota de Pagamento | `BuscaPaymentNote.tsx` | Busca/edição de NPs por nº + ano |
| Regra de Imposto | `BuscaTaxRule.tsx` | Busca/edição de TaxRules por ID |
| DARF | `BuscaDarf.tsx` | Relatório de retenções agrupado por cód. receita |

---

## Entidades e Fluxo de Dados

O fluxo principal é vincular **Notas de Pagamento (NPs)** a **Empenhos**, opcionalmente com um **Planejamento Financeiro (PF)**.

```
PaymentNoteEmpenhoDto (vínculo principal)
├── paymentNoteBasicDto (PaymentNoteDto)
│   ├── numeroNp, dataLiquidacao, docOrigin, value, status
│   ├── empresa (EmpresaDto) — nome, cnpj
│   └── tax (TaxDto)
│       ├── tipo (OPTANTE | NAO_OPTANTE)
│       ├── codEfd
│       ├── codigoReceita (read-only)
│       ├── taxRuleDescription (read-only)
│       ├── taxStatus (CALCULATED | PENDING | EXEMPT)
│       └── calculatedItems[] → { taxType, rate, amount }
├── empenhoDto (EmpenhoDto)
│   └── numero, ano, fontDeOrigin, internalPlan, nature
├── financialPlanningBasicDto (FinancialPlanningDto | null)
│   └── numero, data, vinculation, origin
└── value
```

---

## Interfaces TypeScript (`src/types/index.ts`)

| Interface | Descrição |
|-----------|-----------|
| `EmpenhoDto` | Empenho: numero, ano, fontDeOrigin, internalPlan, nature |
| `EmpresaDto` | Empresa/Credor: nome, cnpj |
| `FinancialPlanningDto` | Planejamento Financeiro: numero, data, vinculation, origin |
| `TaxDto` | Tributação da NP: tipo, codEfd, items calculados |
| `TaxCalculatedItem` | Item calculado: taxType, rate, amount |
| `PaymentNoteDto` | Nota de Pagamento completa |
| `PaymentNoteEmpenhoDto` | Vínculo principal (NP + Empenho + PF) |
| `PaymentNoteVinculacaoDto` | Retorno do relatório por mês/ano |
| `PaymentNoteEmpenhoBasicDto` | Retorno de vínculos sem PF |
| `TaxRuleDto` | Regra de imposto versionada por datas de vigência |
| `TaxRuleItemDto` | Item da regra: taxType, rate (decimal) |

---

## Endpoints da API

Todas as chamadas via `src/services/api.ts` → `http://localhost:8080/API`.

### PaymentNoteEmpenho (Vínculos)

| Função | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| `getAllPaymentEmpenhos(page, size)` | `GET` | `/PaymentEmpenho?page=&size=` | Lista vínculos paginados |
| `savePaymentEmpenho(dto)` | `POST` | `/PaymentEmpenho` | Cria vínculo NP-Empenho |
| `updatePaymentEmpenho(dto)` | `PUT` | `/PaymentEmpenho` | Atualiza vínculo |
| `getPaymentEmpenhoByMesAno(mes, ano, page, size)` | `GET` | `/PaymentEmpenho/por-mes-ano` | Relatório por mês/ano |
| `getPaymentEmpenhoSemPlanejamento(page, size)` | `GET` | `/PaymentEmpenho/sem-planejamento` | Vínculos sem PF |

### Nota de Pagamento (NP)

| Função | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| `findNpByNumeroEAno(numero, ano)` | `GET` | `/Np/{numero}/{ano}` | Busca NP por número e ano |
| `getAllNp(page, size)` | `GET` | `/Np?page=&size=` | Lista NPs paginadas |
| `savePaymentNote(dto)` | `POST` | `/Np` | Cria NP |
| `updatePaymentNote(dto)` | `PUT` | `/Np` | Atualiza NP |

> ⚠️ Em POST/PUT de NP, apenas `tipo` e `codEfd` são enviados no campo `tax`. O backend calcula os impostos (`calculatedItems`) automaticamente via TaxRule vigente.

### Empenho

| Função | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| `findEmpenhoByNumeroEAno(numero, ano)` | `GET` | `/Empenho/{numero}/{ano}` | Busca por número e ano |
| `getAllEmpenho(page, size)` | `GET` | `/Empenho?page=&size=` | Lista paginada |
| `saveEmpenho(dto)` | `POST` | `/Empenho` | Cria empenho |
| `updateEmpenho(dto)` | `PUT` | `/Empenho` | Atualiza empenho |

### Planejamento Financeiro (PF)

| Função | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| `findFinancialPlanningByNumber(numero, ano)` | `GET` | `/FinancialPlanning/{numero}/{ano}` | Busca por número e ano |
| `getAllFinancialPlanning(page, size)` | `GET` | `/FinancialPlanning?page=&size=` | Lista paginada |
| `saveFinancialPlanning(dto)` | `POST` | `/FinancialPlanning` | Cria PF |
| `updateFinancialPlanning(dto)` | `PUT` | `/FinancialPlanning` | Atualiza PF |

### Empresa / Credor

| Função | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| `findEmpresaByCnpj(cnpj)` | `GET` | `/Empresa/{cnpj}` | Busca por CNPJ |
| `getAllEmpresa(page, size)` | `GET` | `/Empresa?page=&size=` | Lista paginada |
| `saveEmpresa(dto)` | `POST` | `/Empresa` | Cria empresa |
| `updateEmpresa(dto)` | `PUT` | `/Empresa` | Atualiza empresa |

### Regras de Imposto (TaxRule)

| Função | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| `getAllTaxRules()` | `GET` | `/TaxRule` | Lista todas as versões (sem paginação) |
| `getTaxRuleById(id)` | `GET` | `/TaxRule/{id}` | Busca versão por ID |
| `createTaxRuleVersion(dto)` | `POST` | `/TaxRule` | Cria nova versão — encerra automaticamente a versão anterior em aberto |
| `updateTaxRule(id, dto)` | `PUT` | `/TaxRule/{id}` | Edita detalhes (description, items, fim de vigência) sem criar nova versão |

> ⚠️ `codEfd` não é editável via PUT — o backend ignora o campo se enviado.

---

## Lógica de TaxRule — Versionamento por Vigência

As regras de imposto são **versionadas** — não são deletadas, apenas têm seu período encerrado.

```
codEfd 17001
  ├── versão 1: início 01/01/2020, fim 31/12/2024  → Encerrada
  └── versão 2: início 01/01/2025, fim null         → Em Vigor (ativa)
```

- **POST /TaxRule**: Cria uma nova versão para um `codEfd`. Se já existir versão em aberto, o backend encerra a anterior automaticamente.
- **PUT /TaxRule/{id}**: Corrige detalhes menores de uma versão existente (descrição, alíquotas, data de fim).
- A tela `BuscaTaxRule` exibe todas as versões agrupadas por `codEfd`, com status **Em Vigor** / **Encerrada**.

---

## Cálculo de Impostos — Fluxo

```
NP cadastrada (tipo + codEfd)
        ↓
Backend localiza TaxRule vigente para o codEfd
        ↓
Backend calcula: value × rate de cada item
        ↓
Retorna PaymentNoteDto com tax.calculatedItems preenchidos
        ↓
TaxItemsDisplay.tsx exibe: | Tipo | Alíquota | Valor |
```

---

## Padrão de Busca e Edição Unificada

O sistema implementa **Busca e Edição Unificada** — não existem blocos "somente leitura" separados do formulário de edição.

### Fluxo "Buscar por ID/Número"
1. Usuário informa o identificador e busca.
2. Se encontrado, o formulário de edição é aberto diretamente com os dados preenchidos.
3. Cancelar fecha o formulário e retorna ao estado vazio.

### Fluxo "Buscar Todos"
1. Usuário clica em "Buscar Todas/Todos".
2. Uma tabela de resultados é exibida.
3. Clicar em ✏️ (`EditIconButton`) **oculta** a tabela e exibe o formulário de edição.
4. Salvar ou Cancelar retorna à tabela automaticamente.

> Sem modais sobrepostos. Sem informações duplicadas acima e abaixo simultaneamente.

---

## Custom Hook — `useEntitySearch<T>`

Todas as telas de busca utilizam o hook genérico `useEntitySearch<T>` (`src/hooks/useEntitySearch.ts`), que encapsula:

- Estados de **busca**: `loading`, `error`
- Estados de **listagem**: `allResults`, `showAll`
- Estados de **edição**: `found`, `editing`
- Estados de **salvamento**: `saving`, `saveError`, `success`
- Handlers de **requisição**: `handleSearchRequest`, `handleGetAllRequest`, `handleSaveRequest`

```typescript
const {
  loading, error, setError,
  allResults, showAll,
  found, setFound, editing, setEditing,
  saving, saveError, success,
  handleSearchRequest,    // (requestFn, onSuccess?) => void
  handleGetAllRequest,    // (requestFn) => void
  handleSaveRequest,      // (requestFn, msg, onSuccessCallback?) => void
} = useEntitySearch<EmpresaDto>();
```

> Campos locais de formulário (`nome`, `cnpj`, etc.) são mantidos com `useState` avulso, isolados da lógica do hook.

---

## Componentes Principais

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| `PageShell` | `components/PageShell.tsx` | Layout com header fixo, nav e brasão de fundo |
| `Alert` | `components/Alert.tsx` | Feedback visual de sucesso/erro com botão de fechar |
| `Button` | `components/Button.tsx` | Botão com `variant` (primary/ghost/danger) e estado `loading` |
| `Input` | `components/Input.tsx` | Input com label flutuante, aplicar em todos os campos de texto |
| `Select` | `components/Select.tsx` | Select com label — **obrigatório** para campos de enum |
| `EditIconButton` | `components/EditIconButton.tsx` | Ícone ✏️ para edição nas linhas de tabela |
| `PaginationControls` | `components/PaginationControls.tsx` | Controles de paginação com página atual / total |
| `TaxItemsDisplay` | `components/TaxItemsDisplay.tsx` | Exibe impostos calculados em grid de colunas fixas (Tipo \| Alíquota \| Valor) |
| `TaxRuleItemEditor` | `components/TaxRuleItemEditor.tsx` | Editor de itens de regra (adicionar/remover tipos e alíquotas) |
| `TableContainer` | `pages/BuscaTabs/Shared.tsx` | Wrapper `.glass-panel` para tabelas de resultados |
| `SectionTitle` | `pages/BuscaTabs/Shared.tsx` | Título de seção com prefixo `▶` em amber |
| `ReadField` | `pages/BuscaTabs/Shared.tsx` | Campo somente-leitura com destaque visual |

---

## Tema Visual — "Dark Militar"

| Elemento | Classe / Estilo |
|----------|-----------------|
| Fundo geral | `bg-[#0e1410]` |
| Cards / painéis | `.glass-panel` → `bg-black/60 backdrop-blur-md border border-white/10 rounded-xl shadow-inner` |
| Header | `bg-black/60 backdrop-blur-md border-b border-white/10` |
| Brasão background | `fixed bg-cover bg-center opacity-25` |
| Destaques (IDs, números, valores) | `text-amber-400` / `text-amber-500` |
| Texto base | `text-gray-200` / `text-gray-300` |
| Texto secundário/labels | `text-stone-500` |
| Status `PAGA` | `text-emerald-400` |
| Status `CANCELADA` | `text-red-400` |
| Status `A_PAGAR` | `text-amber-400` |
| Status `Em Vigor` (TaxRule) | `text-emerald-400` |
| Status `Encerrada` (TaxRule) | `text-stone-500` |
| Tamanho de fonte base | `17px` (definido em `index.css` → `html { font-size: 17px }`) |

### Alternância de Tema (Light Mode)
O sistema possui suporte a um **Tema Claro (Light Mode)** acessível via botão (☀️/🌙) no cabeçalho.
- O tema claro é gerado nativamente via **filtros CSS** (`filter: invert(1) hue-rotate(180deg)`) aplicados no `index.css` à classe `.theme-light`.
- A preferência do usuário é salva no `localStorage` sob a chave `theme`.
- Imagens e brasões possuem proteção de filtro (`.no-invert`) para preservarem suas cores originais.

---

## Convenções de Código

- **Imports**: primeiro bibliotecas externas, depois relativas (`../../`, `../`)
- **Estilos**: Tailwind via `className` — **nenhum** CSS inline, **nenhum** `style={{}}`
- **Componentes de página**: um arquivo por tela
- **Hooks**: todos em `src/hooks/`
- **TypeScript estrito**: erros de tipo falham o build (`tsc --noEmit`)
- **Enums**: usar `<Select />`, nunca `<Input />` para campos como `status` e `tipo`
- **Nomenclatura UI**: Planejamento Financeiro = **PF** (não "FP")

---

## Observações Técnicas e Armadilhas Known

### 1. Formatação de datas para o back-end
O backend espera `dataLiquidacao` (NP) e `data` (PF) estritamente no formato `DD/MM/YYYY`. Em operações POST/PUT, **sempre** usar `formatDate` (de `src/lib/utils.ts`) antes de submeter. As funções de `api.ts` já aplicam essa transformação internamente.

### 2. Nomenclatura das propriedades no DTO
- A propriedade do empenho no vínculo **deve** se chamar `empenhoDto` (não variações).
- Apresentar PF como **PF** na interface (não "FP").
- O campo `ns` (Nota de Saque) **foi removido** de `PaymentNoteDto` e da API — não recriar.

### 3. Payload de TaxDto em POST/PUT de NP
Apenas `tipo` e `codEfd` devem ser enviados no campo `tax`. **Nunca** enviar `calculatedItems`, `taxStatus` ou `taxRuleDescription` — são campos read-only calculados pelo backend.

### 4. TaxRule — `codEfd` não é editável
O `codEfd` de uma TaxRule não pode ser alterado via PUT. O backend ignora o campo. Para "mover" uma regra para outro `codEfd`, crie uma nova regra via POST.

### 5. Paginação
As entidades principais (PaymentEmpenho, NP, Empenho, FinancialPlanning, Empresa) retornam respostas paginadas (`PageDto<T>`). Sempre trabalhar com `.content` para acessar os dados.

Os controles de paginação são exibidos **tanto no topo quanto no rodapé** de todas as listas paginadas, evitando que o usuário precise rolar até o final da página para navegar entre páginas mais antigas. Isso se aplica a:

- Todas as abas de busca (`BuscaEmpresa`, `BuscaEmpenho`, `BuscaFinancialPlanning`, `BuscaPaymentNote`)
- Relatório DARF (`BuscaDarf`)
- Dashboard principal (`Dashboard`)

> `BuscaTaxRule` **não** possui paginação — a API de TaxRule retorna todas as versões de uma vez, sem `page`/`size`.

### 6. Formatação Numérica (Moeda PT-BR)
Para entradas de valores monetários na interface, **não** dependa do tipo `type="number"` puro, pois ele força o formato americano (ex: `1254.65`) e bloqueia separadores de milhar e decimais com vírgula (ex: `1.254,65`).
Use `type="text"` no input, e processe o valor com o formatador genérico `parseBRCurrency(value)` da `src/lib/utils.ts` antes de persistir no estado lógico numérico.

### 7. Deduplicação e Impostos no DARF
O backend pode retornar relacionamentos múltiplos (um mesmo item associado a múltiplos empenhos), inflando o produto cartesiano das chamadas HTTP. Para cálculos de relatório (ex: `BuscaDarf.tsx`), é obrigatório deduplicar os itens pelo ID (`np.items[].id`) utilizando `Set` antes de somar totais, evitando duplicidade nos agregados DARF. Adicionalmente, typos do backend como `CLSS` são normalizados em tempo de execução para garantir que o tipo `CSLL` englobe-os perfeitamente.

### 8. Sem gerenciador de estado externo
O projeto usa apenas `useState` e `useEffect` nativos. Não introduzir Redux, Zustand, Context API ou similares sem decisão explícita.

---

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia dev server em `http://localhost:5173` |
| `npm run build` | Gera build de produção (`tsc && vite build`) |
| `npm run preview` | Visualiza o build de produção localmente |
