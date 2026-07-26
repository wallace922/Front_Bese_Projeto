import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role } from '../types';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuthUser {
  role: Role;
  name: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// ── Decodificação do JWT ───────────────────────────────────────────────────────

function decodeToken(token: string): AuthUser | null {
  try {
    // Remove o prefixo "Bearer " caso exista
    const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = JSON.parse(atob(rawToken.split('.')[1]));
    return {
      role: payload.role as Role,
      name: payload.sub ?? 'Usuário',
    };
  } catch {
    return null;
  }
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('token');
    return saved ? decodeToken(saved) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setUser(decodeToken(token));
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
