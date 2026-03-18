import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Car, FileText, ClipboardList, LogOut, Wrench, BookOpen } from 'lucide-react';
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

export const Sidebar = () => {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <div className="flex items-center gap-2 text-petroleum-700 font-bold text-xl">
          <div className="bg-petroleum-600 p-1.5 rounded-lg">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <span>V9 OS</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-0.5">
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group">
          <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
};
