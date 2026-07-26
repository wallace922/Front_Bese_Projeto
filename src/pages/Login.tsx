import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginUser } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cpf.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    const result = await loginUser(cpf.trim(), password);
    setLoading(false);

    if (result.data?.token) {
      login(result.data.token);
      navigate('/', { replace: true });
    } else {
      setError(result.errorMessage ?? 'Usuário ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-black font-sans">
      {/* Fundo com brasão */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/brasao.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.12,
        }}
      />
      <div className="absolute inset-0 bg-black/70 z-0" />

      {/* Card de Login */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-2xl border border-amber-500/20 bg-black/80 backdrop-blur-md shadow-2xl p-8 flex flex-col items-center gap-6">
          
          {/* Logo / Brasão */}
          <div className="flex flex-col items-center gap-2">
            <img
              src="/brasao.png"
              alt="Brasão Seção de Tesouraria"
              className="h-20 w-20 object-contain drop-shadow-lg"
            />
            <h1 className="text-amber-400 font-black tracking-widest text-lg uppercase">
              Gestão de Tesouraria
            </h1>
            <p className="text-stone-500 text-xs tracking-widest uppercase">
              Sistema de Controle Financeiro
            </p>
          </div>

          {/* Separador */}
          <div className="w-full h-px bg-amber-500/20" />

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="login-cpf" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                CPF
              </label>
              <input
                id="login-cpf"
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="text-red-400 text-xs font-semibold bg-red-900/20 border border-red-500/20 rounded-lg px-4 py-2 text-center">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-black uppercase tracking-widest text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
