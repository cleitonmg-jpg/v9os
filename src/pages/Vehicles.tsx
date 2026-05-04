import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Car, UserPlus } from 'lucide-react';
import api from '../lib/api';
import { Modal } from '../components/Modal';
import type { Vehicle, Client } from '../types';

interface VehicleForm {
  plate: string; brand: string; model: string; year: string;
  color: string; chassis: string; mileage: string; clientId: string;
}
const EMPTY: VehicleForm = { plate: '', brand: '', model: '', year: '', color: '', chassis: '', mileage: '', clientId: '' };

interface NewClientForm { name: string; phone: string; cpfCnpj: string; email: string; }
const EMPTY_CLIENT: NewClientForm = { name: '', phone: '', cpfCnpj: '', email: '' };

export const Vehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<VehicleForm>({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState<NewClientForm>({ ...EMPTY_CLIENT });
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState('');

  const load = useCallback(async () => {
    const [v, c] = await Promise.all([api.get('/vehicles'), api.get('/clients')]);
    setVehicles(v.data); setClients(c.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY }); setError(''); setShowNewClient(false);
    setNewClient({ ...EMPTY_CLIENT }); setClientError(''); setModal('create');
  };

  const handleSaveNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) { setClientError('Nome é obrigatório'); return; }
    setSavingClient(true); setClientError('');
    try {
      const { data } = await api.post('/clients', {
        name: newClient.name, phone: newClient.phone,
        cpfCnpj: newClient.cpfCnpj || undefined, email: newClient.email || undefined,
      });
      // Recarrega clientes e seleciona o novo
      const res = await api.get('/clients');
      setClients(res.data);
      const created = res.data.find((c: Client) => c.id === data.id) || res.data[res.data.length - 1];
      setForm(p => ({ ...p, clientId: String(created.id) }));
      setShowNewClient(false);
      setNewClient({ ...EMPTY_CLIENT });
    } catch (err: any) {
      setClientError(err.response?.data?.message || 'Erro ao cadastrar cliente');
    } finally {
      setSavingClient(false);
    }
  };
  const openEdit = (v: Vehicle) => {
    setForm({ plate: v.plate, brand: v.brand, model: v.model, year: String(v.year), color: v.color, chassis: v.chassis || '', mileage: String(v.mileage), clientId: String(v.clientId) });
    setEditId(v.id); setError(''); setShowNewClient(false); setNewClient({ ...EMPTY_CLIENT }); setClientError(''); setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const data = { ...form, year: Number(form.year), mileage: Number(form.mileage), clientId: Number(form.clientId) };
    try {
      if (modal === 'create') await api.post('/vehicles', data);
      else await api.put(`/vehicles/${editId}`, data);
      setModal(null); load();
    } catch (err: any) { setError(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, plate: string) => {
    if (!confirm(`Excluir veículo "${plate}"?`)) return;
    try { await api.delete(`/vehicles/${id}`); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Erro ao excluir'); }
  };

  const filtered = vehicles.filter(v =>
    v.plate.toLowerCase().includes(search.toLowerCase()) ||
    v.brand.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase()) ||
    (v.client?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const F = (field: keyof VehicleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Veículos</h2>
          <p className="text-sm text-slate-500">{vehicles.length} veículo(s) cadastrado(s)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Novo Veículo
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por placa, marca, modelo..."
          className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Veículo</th>
                <th className="px-6 py-4">Ano/Cor</th>
                <th className="px-6 py-4">Km</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-40" /> Nenhum veículo encontrado
                </td></tr>
              )}
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-petroleum-700 text-sm">{v.plate}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{v.brand} {v.model}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.year} · {v.color}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.mileage.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.client?.name || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(v.id, v.plate)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
        <Modal title={modal === 'create' ? 'Novo Veículo' : 'Editar Veículo'} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Placa *</label>
                <input value={form.plate} onChange={F('plate')} required placeholder="ABC-1234"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 uppercase" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Cliente *</label>
                  <button type="button" onClick={() => { setShowNewClient(v => !v); setClientError(''); }}
                    className="flex items-center gap-1 text-xs text-petroleum-600 hover:text-petroleum-800 font-semibold">
                    <UserPlus className="w-3.5 h-3.5" />
                    {showNewClient ? 'Cancelar' : 'Novo cliente'}
                  </button>
                </div>
                {!showNewClient ? (
                  <select value={form.clientId} onChange={F('clientId')} required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="border border-petroleum-200 bg-petroleum-50/40 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-petroleum-700 uppercase tracking-wider">Cadastrar novo cliente</p>
                    {clientError && <p className="text-xs text-red-600">{clientError}</p>}
                    <input value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nome completo *"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 bg-white" />
                    <input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                      placeholder="Telefone"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 bg-white" />
                    <input value={newClient.cpfCnpj} onChange={e => setNewClient(p => ({ ...p, cpfCnpj: e.target.value }))}
                      placeholder="CPF / CNPJ (opcional)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 bg-white" />
                    <button type="button" onClick={handleSaveNewClient} disabled={savingClient}
                      className="w-full py-2 bg-petroleum-600 hover:bg-petroleum-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors">
                      {savingClient ? 'Salvando...' : 'Salvar cliente e selecionar'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marca *</label>
                <input value={form.brand} onChange={F('brand')} required placeholder="Toyota"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modelo *</label>
                <input value={form.model} onChange={F('model')} required placeholder="Corolla"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano *</label>
                <input type="number" value={form.year} onChange={F('year')} required min={1900} max={2030} placeholder="2022"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cor *</label>
                <input value={form.color} onChange={F('color')} required placeholder="Prata"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quilometragem *</label>
                <input type="number" value={form.mileage} onChange={F('mileage')} required min={0} placeholder="15000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chassi</label>
                <input value={form.chassis} onChange={F('chassis')} placeholder="Opcional"
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
