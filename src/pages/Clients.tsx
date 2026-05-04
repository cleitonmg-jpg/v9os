import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Users } from 'lucide-react';
import api from '../lib/api';
import { Modal } from '../components/Modal';
import type { Client } from '../types';

const EMPTY: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'vehicles'> = {
  name: '', cpfCnpj: '', phone: '', email: '', address: '',
};

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/clients');
    setClients(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...EMPTY }); setError(''); setModal('create'); };
  const openEdit = (c: Client) => {
    setForm({ name: c.name, cpfCnpj: c.cpfCnpj, phone: c.phone, email: c.email || '', address: c.address || '' });
    setEditId(c.id); setError(''); setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.post('/clients', form);
      else await api.put(`/clients/${editId}`, form);
      setModal(null); load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir cliente "${name}"?`)) return;
    try { await api.delete(`/clients/${id}`); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Erro ao excluir'); }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpfCnpj || '').includes(search) ||
    c.phone.includes(search)
  );

  const F = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-sm text-slate-500">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, CPF/CNPJ..."
          className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">CPF/CNPJ</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Veículos</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum cliente encontrado
                </td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.cpfCnpj}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.phone}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{c.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.vehicles?.length || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Novo Cliente' : 'Editar Cliente'} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input value={form.name} onChange={F('name')} required placeholder="Nome completo"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ</label>
                <input value={form.cpfCnpj} onChange={F('cpfCnpj')} placeholder="000.000.000-00 (opcional)"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input value={form.phone} onChange={F('phone')} placeholder="(37) 99999-0000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={F('email')} placeholder="email@exemplo.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input value={form.address} onChange={F('address')} placeholder="Rua, nº, bairro, cidade"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
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
