import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, PowerOff, Wrench } from 'lucide-react';
import api from '../lib/api';
import { Modal } from '../components/Modal';
import type { Technician } from '../types';

interface TechForm { username: string; name: string; password: string; role: string; active: boolean; }
const EMPTY: TechForm = { username: '', name: '', password: '', role: 'technician', active: true };

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', technician: 'Técnico' };

export const Technicians = () => {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<TechForm>({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/technicians');
    setTechs(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...EMPTY }); setError(''); setModal('create'); };
  const openEdit = (t: Technician) => {
    setForm({ username: t.username, name: t.name, password: '', role: t.role, active: t.active });
    setEditId(t.id); setError(''); setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'create') await api.post('/technicians', form);
      else await api.put(`/technicians/${editId}`, form);
      setModal(null); load();
    } catch (err: any) { setError(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (t: Technician) => {
    if (!confirm(`${t.active ? 'Desativar' : 'Reativar'} técnico "${t.name}"?`)) return;
    try { await api.put(`/technicians/${t.id}`, { ...t, active: !t.active }); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Erro'); }
  };

  const filtered = techs.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.username.toLowerCase().includes(search.toLowerCase())
  );

  const F = (field: keyof TechForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Técnicos</h2>
          <p className="text-sm text-slate-500">{techs.filter(t => t.active).length} ativo(s) · {techs.length} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Novo Técnico
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou usuário..."
          className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40" /> Nenhum técnico encontrado
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{t.username}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${t.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {ROLE_LABEL[t.role] || t.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${t.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(t)} className={`p-1.5 rounded-lg ${t.active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                        <PowerOff className="w-4 h-4" />
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
        <Modal title={modal === 'create' ? 'Novo Técnico' : 'Editar Técnico'} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input value={form.name} onChange={F('name')} required placeholder="Nome do técnico"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuário (login) *</label>
                <input value={form.username} onChange={F('username')} required placeholder="usuario"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {modal === 'create' ? 'Senha *' : 'Nova Senha (opcional)'}
                </label>
                <input type="password" value={form.password} onChange={F('password')} required={modal === 'create'} placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função *</label>
                <select value={form.role} onChange={F('role')} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500">
                  <option value="technician">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {modal === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={form.active ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, active: e.target.value === 'true' }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500">
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              )}
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
