import React from 'react';
import { Search, Plus, Filter, MoreVertical, FileText } from 'lucide-react';

export const BudgetList = () => {
  const budgets = [
    { id: 101, client: 'João Silva', vehicle: 'Toyota Corolla', date: '14/03/2026', total: 'R$ 1.250,00', status: 'Em Análise' },
    { id: 102, client: 'Maria Oliveira', vehicle: 'Honda Civic', date: '14/03/2026', total: 'R$ 850,00', status: 'Aprovado' },
    { id: 103, client: 'Loja V9', vehicle: 'Fiat Uno', date: '13/03/2026', total: 'R$ 450,00', status: 'Pendente' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-bold text-slate-800 text-lg">Gerenciamento de Orçamentos</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente ou placa..." 
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-petroleum-500 w-64"
            />
          </div>
          <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
            <Filter className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 shadow-md shadow-petroleum-100">
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-4">Nº</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Veículo</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {budgets.map((os) => (
              <tr key={os.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-bold text-slate-700">#{os.id}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{os.client}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{os.vehicle}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{os.date}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{os.total}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    os.status === 'Aprovado' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {os.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-petroleum-600 rounded-lg hover:bg-petroleum-50">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
