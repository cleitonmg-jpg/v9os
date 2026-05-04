import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', technician: 'Técnico' };

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initials = user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-64 p-4 md:p-8 min-w-0">
        <header className="mb-6 md:mb-8 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Botão hamburger — visível apenas no mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate">
                Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 truncate">
                V9 INFORMÁTICA LTDA · Gestão de Oficina
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 truncate max-w-[120px] md:max-w-none">{user?.name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-petroleum-100 flex items-center justify-center text-petroleum-700 font-bold border-2 border-white shadow-sm text-sm flex-shrink-0">
              {initials}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};
