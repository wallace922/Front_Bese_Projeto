import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavLink {
  to: string;
  label: string;
  icon: string;
}



interface PageShellProps {
  children: React.ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('theme') === 'light');

  const navLinks: NavLink[] = [
    { to: '/',            label: 'Dashboard', icon: '⊞' },
    { to: '/busca',       label: 'Busca',     icon: '🔍' },
    { to: '/cadastro',    label: 'Cadastro',  icon: '＋' },
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: 'Admin', icon: '⚙' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  const linkClasses = (to: string) =>
    [
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold uppercase tracking-widest transition-all duration-150 border',
      isActive(to)
        ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
        : 'bg-transparent border-white/20 text-stone-400 hover:border-white/40 hover:text-stone-200',
    ].join(' ');

  return (
    <div className="min-h-screen font-sans relative bg-military-950 text-gray-200">
      <div className="brasao-bg fixed inset-0 z-0 pointer-events-none" />
      <div className="fixed inset-0 bg-black/50 z-0 pointer-events-none" />

      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 h-16 sm:h-20 lg:h-24 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="h-12 sm:h-16 lg:h-20 flex items-center justify-center shrink-0">
            <img src="/brasao.png" alt="Brasão Seção de Tesouraria" className="h-full aspect-square object-contain drop-shadow-md" />
          </div>
          <div className="min-w-0">
            <h1 className="text-amber-400 font-black tracking-widest text-sm sm:text-base uppercase truncate">
              Gestão de Tesouraria
            </h1>
            <p className="text-stone-500 text-xs tracking-widest uppercase truncate">
              Sistema de Controle Financeiro
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className={linkClasses(link.to)}>
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <button 
            onClick={toggleTheme}
            className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-white/20 text-stone-400 hover:text-amber-400 hover:border-white/40 transition-colors"
            title={isLightMode ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro'}
          >
            {isLightMode ? '🌙' : '☀️'}
          </button>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-all duration-150"
            title="Sair"
          >
            🚪 Sair
          </button>
        </nav>

        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-md text-stone-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute top-0 right-0 h-full w-64 bg-military-950 border-l border-white/10 p-6 flex flex-col gap-2 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Navegação</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-stone-400 hover:text-amber-400 transition-colors"
                aria-label="Fechar menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150 border',
                  isActive(link.to)
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                    : 'bg-transparent border-transparent text-stone-400 hover:border-white/20 hover:text-stone-200',
                ].join(' ')}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
              <button 
                onClick={() => { toggleTheme(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-stone-400 hover:text-amber-400 hover:border-white/40 transition-colors text-sm font-bold uppercase tracking-widest w-full justify-center"
              >
                {isLightMode ? '🌙 Tema Escuro' : '☀️ Tema Claro'}
              </button>
              <button
                id="logout-btn-mobile"
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/20 border border-red-500/20 text-red-400 hover:border-red-500/40 transition-colors text-sm font-bold uppercase tracking-widest w-full justify-center"
              >
                🚪 Sair
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="relative z-10">{children}</main>
    </div>
  );
}
