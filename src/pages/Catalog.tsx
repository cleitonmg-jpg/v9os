import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../lib/api';
import { Modal } from '../components/Modal';
import type { ServiceItem } from '../types';

const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ItemForm {
  description: string;
  type: 'SERVICE' | 'PART';
  costPrice: string;
  unitPrice: string;
  stock: string;
  active: boolean;
}

const emptyForm = (): ItemForm => ({ description: '', type: 'SERVICE', costPrice: '', unitPrice: '', stock: '0', active: true });

export const Catalog: React.FC = () => {
  const [list, setList] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SERVICE' | 'PART'>('ALL');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await api.get('/catalog');
    setList(res.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm()); setError(''); setModal('create'); };
  const openEdit = (item: ServiceItem) => {
    setForm({ description: item.description, type: item.type, costPrice: String(item.costPrice), unitPrice: String(item.unitPrice), stock: String(item.stock), active: item.active });
    setEditId(item.id); setError(''); setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const data = { ...form, costPrice: Number(form.costPrice), unitPrice: Number(form.unitPrice), stock: Number(form.stock) };
      if (modal === 'create') await api.post('/catalog', data);
      else await api.put(`/catalog/${editId}`, data);
      setModal(null); load();
    } catch (err: any) { setError(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`Excluir "${item.description}"?`)) return;
    try { await api.delete(`/catalog/${item.id}`); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Erro ao excluir'); }
  };

  const toggleActive = async (item: ServiceItem) => {
    try { await api.put(`/catalog/${item.id}`, { ...item, active: !item.active }); load(); }
    catch { alert('Erro ao atualizar'); }
  };

  const filtered = list.filter(i => {
    const matchSearch = i.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || i.type === filterType;
    return matchSearch && matchType;
  });

  const F = (field: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Catálogo de Serviços & Peças</h2>
          <p className="text-sm text-slate-500">{list.filter(i => i.active).length} ativo(s) · {list.length} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Novo Item
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descrição..."
            className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['ALL', 'SERVICE', 'PART'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === t ? 'bg-petroleum-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {t === 'ALL' ? 'Todos' : t === 'SERVICE' ? 'Serviços' : 'Peças'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Custo</th>
                <th className="px-6 py-4">Venda</th>
                <th className="px-6 py-4">Estoque</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" /> Nenhum item encontrado
                </td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${!item.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{item.description}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${item.type === 'SERVICE' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.type === 'SERVICE' ? 'Serviço' : 'Peça'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{fmtCurrency(item.costPrice)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmtCurrency(item.unitPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${item.stock <= 0 ? 'text-red-500' : item.stock <= 5 ? 'text-amber-600' : 'text-green-600'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(item)} className="flex items-center gap-1.5 text-xs font-medium">
                      {item.active
                        ? <><ToggleRight className="w-4 h-4 text-green-500" /><span className="text-green-600">Ativo</span></>
                        : <><ToggleLeft className="w-4 h-4 text-slate-400" /><span className="text-slate-400">Inativo</span></>}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'Novo Item do Catálogo' : 'Editar Item'} onClose={() => setModal(null)} size="md">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
              <input value={form.description} onChange={F('description')} required
                placeholder="Ex: Alinhamento, Troca de óleo, Pastilha de freio..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select value={form.type} onChange={F('type')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500">
                  <option value="SERVICE">Serviço</option>
                  <option value="PART">Peça</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estoque</label>
                <input type="number" value={form.stock} min={0} step="1" onChange={F('stock')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor de Custo (R$)</label>
                <input type="number" value={form.costPrice} min={0} step="0.01" onChange={F('costPrice')} placeholder="0,00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor de Venda (R$)</label>
                <input type="number" value={form.unitPrice} min={0} step="0.01" onChange={F('unitPrice')} placeholder="0,00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 text-petroleum-600 rounded" />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">Item ativo (disponível para seleção)</label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-petroleum-600 hover:bg-petroleum-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
