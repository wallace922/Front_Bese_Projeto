import { useState, useEffect, type FormEvent } from 'react';
import PageShell from '../components/PageShell';
import ConfirmModal from '../components/ConfirmModal';
import {
  getAllUsers,
  getUserByCpf,
  createUser,
  updateUser,
  deleteUser,
} from '../services/api';
import type { UserDto, UserCreateDto, UserUpdateDto, Role } from '../types';
import type { PageDto } from '../services/api';

// ── Componente principal ──────────────────────────────────────────────────────

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'search'>('list');

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Cabeçalho */}
        <div className="flex flex-col gap-1">
          <h2 className="text-amber-400 font-black tracking-widest text-xl uppercase">
            ⚙ Painel Administrativo
          </h2>
          <p className="text-stone-500 text-xs tracking-widest uppercase">
            Gerenciamento de Usuários
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          {([
            { key: 'list',   label: 'Listar Usuários', icon: '☰' },
            { key: 'create', label: 'Novo Usuário',    icon: '＋' },
            { key: 'search', label: 'Buscar por CPF',  icon: '🔍' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'px-4 py-2 rounded-t text-xs font-bold uppercase tracking-widest border-b-2 transition-all',
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-stone-500 hover:text-stone-300',
              ].join(' ')}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'list'   && <UserListTab />}
        {activeTab === 'create' && <UserCreateTab onSuccess={() => setActiveTab('list')} />}
        {activeTab === 'search' && <UserSearchTab />}
      </div>
    </PageShell>
  );
}

// ── Tab: Listar Usuários ───────────────────────────────────────────────────────

function UserListTab() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageDto<UserDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserDto | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    const res = await getAllUsers(p, 10);
    setLoading(false);
    if (res.data) setData(res.data);
    else setError(res.errorMessage ?? 'Erro ao carregar usuários.');
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = async (user: UserDto) => {
    setDeletingUser(true);
    const res = await deleteUser(user.id);
    setDeletingUser(false);
    setConfirmDelete(null);
    if (res.status === 204 || res.status === 200) {
      setActionMsg({ type: 'ok', msg: `Usuário "${user.name}" removido com sucesso.` });
      load();
    } else {
      setActionMsg({ type: 'err', msg: res.errorMessage ?? 'Erro ao remover usuário.' });
    }
    setTimeout(() => setActionMsg(null), 3500);
  };

  const roleBadge = (role: Role) => {
    const colors: Record<Role, string> = {
      ADMIN:  'bg-amber-500/20 text-amber-400 border-amber-500/40',
      USER:   'bg-blue-500/20 text-blue-400 border-blue-500/40',
    };
    return (
      <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${colors[role] ?? colors.USER}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {actionMsg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-semibold border ${actionMsg.type === 'ok' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-red-900/20 text-red-400 border-red-500/20'}`}>
          {actionMsg.msg}
        </div>
      )}

      {loading && <p className="text-stone-500 text-sm">Carregando...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {data && (
        <>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-stone-500 text-xs uppercase tracking-widest">
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">CPF</th>
                  <th className="px-4 py-3 text-left">Perfil</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-white/5 transition-colors hover:bg-white/5 ${i % 2 === 0 ? 'bg-black/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-stone-500 font-mono">{u.id}</td>
                    <td className="px-4 py-3 text-gray-200 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 text-stone-400 font-mono">{u.cpf}</td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <button
                        id={`edit-user-${u.id}`}
                        onClick={() => setEditingUser(u)}
                        className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        id={`delete-user-${u.id}`}
                        onClick={() => setConfirmDelete(u)}
                        className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Total: {data.totalElements} usuários</span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-white/10 hover:border-white/30 disabled:opacity-30 transition-colors"
              >
                ← Anterior
              </button>
              <span className="px-3 py-1">Pág. {page + 1} / {data.totalPages}</span>
              <button
                disabled={data.isLast}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-white/10 hover:border-white/30 disabled:opacity-30 transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Edição */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => { setEditingUser(null); load(); }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <ConfirmModal
          message={`Deseja realmente excluir o usuário "${confirmDelete.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          loading={deletingUser}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Tab: Criar Usuário ────────────────────────────────────────────────────────

function UserCreateTab({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<UserCreateDto>({ name: '', cpf: '', password: '', role: 'USER' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await createUser(form);
    setLoading(false);
    if (res.data) {
      setMsg({ type: 'ok', text: `Usuário "${res.data.name}" criado com sucesso!` });
      setForm({ name: '', cpf: '', password: '', role: 'USER' });
      setTimeout(onSuccess, 1500);
    } else {
      setMsg({ type: 'err', text: res.errorMessage ?? 'Erro ao criar usuário.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md flex flex-col gap-4">
      <FormField id="create-name" label="Nome completo" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
      <FormField id="create-cpf" label="CPF (apenas números)" value={form.cpf} onChange={v => setForm(f => ({ ...f, cpf: v }))} placeholder="00000000000" />
      <FormField id="create-password" label="Senha" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
      <RoleSelect id="create-role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} />

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-semibold border ${msg.type === 'ok' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-red-900/20 text-red-400 border-red-500/20'}`}>
          {msg.text}
        </div>
      )}

      <button
        id="create-user-submit"
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50"
      >
        {loading ? 'Criando...' : 'Criar Usuário'}
      </button>
    </form>
  );
}

// ── Tab: Buscar por CPF ───────────────────────────────────────────────────────

function UserSearchTab() {
  const [cpf, setCpf] = useState('');
  const [result, setResult] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!cpf.trim()) return;
    setLoading(true);
    const res = await getUserByCpf(cpf.trim());
    setLoading(false);
    if (res.data) setResult(res.data);
    else setError(res.errorMessage ?? 'Usuário não encontrado.');
  };

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          id="search-cpf-input"
          type="text"
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          placeholder="CPF do usuário"
          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500/60 transition-all"
        />
        <button
          id="search-cpf-submit"
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-5 flex flex-col gap-2">
          <p className="text-xs text-stone-500 uppercase tracking-widest">Resultado</p>
          <p className="text-gray-200 font-bold text-lg">{result.name}</p>
          <p className="text-stone-400 font-mono text-sm">CPF: {result.cpf}</p>
          <p className="text-stone-400 text-sm">ID: {result.id}</p>
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border w-fit ${result.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}>
            {result.role}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Modal de Edição ───────────────────────────────────────────────────────────

function UserEditModal({ user, onClose, onSuccess }: { user: UserDto; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<UserUpdateDto>({ name: user.name, password: '', role: user.role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload: UserUpdateDto = { name: form.name, role: form.role };
    if (form.password && form.password.trim()) payload.password = form.password;
    const res = await updateUser(user.id, payload);
    setLoading(false);
    if (res.data) onSuccess();
    else setError(res.errorMessage ?? 'Erro ao atualizar usuário.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-black/90 shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-amber-400 font-black uppercase tracking-widest text-sm">Editar Usuário</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">✕</button>
        </div>
        <p className="text-stone-500 text-xs">ID: {user.id} | CPF: {user.cpf}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField id="edit-name" label="Nome" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <FormField id="edit-password" label="Nova Senha (deixe vazio para não alterar)" value={form.password ?? ''} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
          <RoleSelect id="edit-role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-stone-400 text-xs font-bold uppercase tracking-widest hover:border-white/30 transition-colors">
              Cancelar
            </button>
            <button
              id="edit-user-submit"
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Nota: ConfirmModal foi extraído para src/components/ConfirmModal.tsx ────────

// ── Componentes de Formulário Reutilizáveis ────────────────────────────────────

function FormField({ id, label, value, onChange, type = 'text', placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-stone-400">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500/60 transition-all"
      />
    </div>
  );
}

function RoleSelect({ id, value, onChange }: { id: string; value: Role; onChange: (v: Role) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-stone-400">Perfil</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as Role)}
        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-sm focus:outline-none focus:border-amber-500/60 transition-all"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
    </div>
  );
}
