import React from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', technician: 'Técnico' };

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const initials = user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}</h1>
            <p className="text-sm text-slate-500">V9 INFORMÁTICA LTDA · Gestão de Oficina</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-petroleum-100 flex items-center justify-center text-petroleum-700 font-bold border-2 border-white shadow-sm text-sm">
              {initials}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};
