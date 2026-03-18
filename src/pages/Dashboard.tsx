import React, { useEffect, useState } from 'react';
import { ClipboardList, FileCheck, AlertCircle, TrendingUp, Clock, Car, Wrench } from 'lucide-react';
import api from '../lib/api';
import type { Stats } from '../types';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-600', IN_PROGRESS: 'bg-orange-50 text-orange-600',
  WAITING: 'bg-yellow-50 text-yellow-600', COMPLETED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento', WAITING: 'Aguardando', COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
};

const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <div className={`p-2 rounded-xl ${color} inline-block mb-4`} style={{ opacity: 0.15 }}>
        <Icon className={`w-6 h-6`} style={{ opacity: 1 }} />
      </div>
      <div className={`p-2 rounded-xl inline-block mb-4 -ml-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
    </div>
    {trend && (
      <span className="flex items-center text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
        <TrendingUp className="w-3 h-3 mr-1" />{trend}
      </span>
    )}
  </div>
);

export const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <div className="p-2 rounded-xl bg-blue-100 mb-4 inline-block"><ClipboardList className="w-6 h-6 text-blue-600" /></div>
            <p className="text-sm font-medium text-slate-500">Orçamentos Abertos</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.openBudgets ?? '—'}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <div className="p-2 rounded-xl bg-green-100 mb-4 inline-block"><FileCheck className="w-6 h-6 text-green-600" /></div>
            <p className="text-sm font-medium text-slate-500">OS Concluídas (Mês)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.completedOs ?? '—'}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <div className="p-2 rounded-xl bg-orange-100 mb-4 inline-block"><AlertCircle className="w-6 h-6 text-orange-500" /></div>
            <p className="text-sm font-medium text-slate-500">Aguardando Aprovação</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.pendingAuth ?? '—'}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <div className="p-2 rounded-xl bg-petroleum-100 mb-4 inline-block"><Car className="w-6 h-6 text-petroleum-600" /></div>
            <p className="text-sm font-medium text-slate-500">Veículos na Oficina</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.activeVehicles ?? '—'}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Últimas Ordens de Serviço</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {!stats?.recentOs?.length && (
              <div className="p-8 text-center text-slate-400 text-sm">Nenhuma OS registrada</div>
            )}
            {stats?.recentOs?.map(os => (
              <div key={os.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-petroleum-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-petroleum-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {os.type === 'OS' ? 'OS' : 'Orçamento'} #{String(os.number).padStart(4, '0')} · {os.client?.name || '?'}
                  </p>
                  <p className="text-xs text-slate-400">{os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model} · ${os.vehicle.plate}` : ''} · {fmtDate(os.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[os.status] || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[os.status] || os.status}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{fmtCurrency(os.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support card */}
        <div className="space-y-6">
          <div className="bg-petroleum-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-2">Suporte V9</h4>
              <p className="text-petroleum-100 text-sm mb-4">Dúvidas ou problemas com o sistema? Entre em contato.</p>
              <div className="flex items-center gap-2 font-bold text-xl mb-4">37 4141-0341</div>
              <a href="tel:3741410341" className="inline-block bg-white text-petroleum-950 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-petroleum-50 transition-colors">
                Ligar Agora
              </a>
            </div>
            <Wrench className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-5 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
};
