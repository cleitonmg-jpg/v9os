import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Car, FileText, ClipboardList, LogOut, Wrench, BookOpen, X, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Car, label: 'Veículos', path: '/vehicles' },
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: Wrench, label: 'Técnicos', path: '/technicians' },
  { icon: BookOpen, label: 'Catálogo', path: '/catalog' },
  { icon: ClipboardList, label: 'Orçamentos', path: '/budgets' },
  { icon: FileText, label: 'Ordens de Serviço', path: '/os' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-petroleum-700 font-bold text-xl">
            <div className="bg-petroleum-600 p-1.5 rounded-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span>V9 OS</span>
          </div>
          {/* Botão fechar — visível apenas no mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  active
                    ? 'bg-petroleum-50 text-petroleum-700 font-semibold'
                    : 'text-slate-600 hover:bg-petroleum-50 hover:text-petroleum-700'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform ${active ? 'text-petroleum-600' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-petroleum-500" />}
              </Link>
            );
          })}

          {/* Minha Empresa — somente admin */}
          {user?.role === 'admin' && (() => {
            const active = location.pathname === '/settings';
            return (
              <Link
                to="/settings"
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  active
                    ? 'bg-petroleum-50 text-petroleum-700 font-semibold'
                    : 'text-slate-600 hover:bg-petroleum-50 hover:text-petroleum-700'
                }`}
              >
                <Building2 className={`w-5 h-5 transition-transform ${active ? 'text-petroleum-600' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">Minha Empresa</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-petroleum-500" />}
              </Link>
            );
          })()}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => { onClose(); logout(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};
