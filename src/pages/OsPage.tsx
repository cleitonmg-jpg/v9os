import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, FileText, ClipboardList, ChevronDown, X, MessageCircle, BookOpen } from 'lucide-react';
import api from '../lib/api';
import { Modal } from '../components/Modal';
import type { OSBudget, Client, Vehicle, Technician, OSItem, ServiceItem } from '../types';
import { OsPdf } from '../components/OsPdf';

interface Props { type: 'BUDGET' | 'OS'; }

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento', WAITING: 'Aguard. Aprovação',
  COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700', IN_PROGRESS: 'bg-orange-50 text-orange-700',
  WAITING: 'bg-yellow-50 text-yellow-700', COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

const newItem = (): OSItem => ({ description: '', quantity: 1, unitPrice: 0, totalPrice: 0, type: 'SERVICE', technicianId: null });

interface OSForm {
  type: 'BUDGET' | 'OS'; status: string; clientId: string; vehicleId: string;
  defectReported: string; notes: string;
}

export const OsPage: React.FC<Props> = ({ type }) => {
  const [list, setList] = useState<OSBudget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [catalog, setCatalog] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [pdfItem, setPdfItem] = useState<OSBudget | null>(null);
  const [catalogPicker, setCatalogPicker] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [form, setForm] = useState<OSForm>({ type, status: 'OPEN', clientId: '', vehicleId: '', defectReported: '', notes: '' });
  const [items, setItems] = useState<OSItem[]>([newItem()]);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [os, cl, ve, te, cat] = await Promise.all([
      api.get('/os'), api.get('/clients'), api.get('/vehicles'), api.get('/technicians'), api.get('/catalog'),
    ]);
    setList(os.data.filter((o: OSBudget) => o.type === type));
    setClients(cl.data); setVehicles(ve.data); setTechnicians(te.data);
    setCatalog(cat.data.filter((i: ServiceItem) => i.active));
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const clientVehicles = vehicles.filter(v => v.clientId === Number(form.clientId));

  const openCreate = () => {
    setForm({ type, status: 'OPEN', clientId: '', vehicleId: '', defectReported: '', notes: '' });
    setItems([newItem()]); setError(''); setModal('create');
  };

  const openEdit = (os: OSBudget) => {
    setForm({ type: os.type, status: os.status, clientId: String(os.clientId), vehicleId: String(os.vehicleId), defectReported: os.defectReported || '', notes: os.notes || '' });
    setItems(os.items.length ? os.items.map(i => ({ ...i })) : [newItem()]);
    setEditId(os.id); setError(''); setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const validItems = items.filter(i => i.description.trim());
    try {
      const payload = { ...form, items: validItems };
      if (modal === 'create') await api.post('/os', payload);
      else await api.put(`/os/${editId}`, payload);
      setModal(null); load();
    } catch (err: any) { setError(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleWhatsApp = (o: OSBudget) => {
    const num = String(o.number).padStart(4, '0');
    const veiculo = o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} (${o.vehicle.plate})` : '';
    const msg = type === 'OS'
      ? `Olá ${o.client?.name || ''}! Sua *Ordem de Serviço Nº ${num}* foi aberta na V9 INFORMÁTICA LTDA.\n\n🚗 Veículo: ${veiculo}\n📋 Status: ${STATUS_LABELS[o.status] || o.status}${o.defectReported ? `\n\n🔧 Defeito relatado: ${o.defectReported}` : ''}\n\nQualquer dúvida, entre em contato: (37) 4141-0341`
      : `Olá ${o.client?.name || ''}! Seu *Orçamento Nº ${num}* foi gerado na V9 INFORMÁTICA LTDA.\n\n🚗 Veículo: ${veiculo}\n💰 Total: ${fmtCurrency(o.totalAmount)}\n📋 Status: ${STATUS_LABELS[o.status] || o.status}\n\nQualquer dúvida, entre em contato: (37) 4141-0341`;
    const phone = o.client?.phone?.replace(/\D/g, '');
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (id: number, num: number) => {
    if (!confirm(`Excluir ${type === 'BUDGET' ? 'Orçamento' : 'OS'} #${num}?`)) return;
    try { await api.delete(`/os/${id}`); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Erro ao excluir'); }
  };

  // Items handlers
  const updateItem = (i: number, field: keyof OSItem, value: string | number | null) => {
    setItems(prev => {
      const next = [...prev];
      (next[i] as any)[field] = value;
      next[i].totalPrice = Number(next[i].quantity) * Number(next[i].unitPrice);
      return next;
    });
  };
  const addItem = () => setItems(p => [...p, newItem()]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const pickFromCatalog = (rowIndex: number, cat: ServiceItem) => {
    setItems(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], description: cat.description, type: cat.type, unitPrice: cat.unitPrice, totalPrice: Number(next[rowIndex].quantity) * cat.unitPrice };
      return next;
    });
    setCatalogPicker(null); setCatalogSearch('');
  };
  const total = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);

  const filtered = list.filter(o =>
    (o.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.vehicle?.plate || '').toLowerCase().includes(search.toLowerCase()) ||
    String(o.number).includes(search)
  );

  const F = (field: keyof OSForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const title = type === 'BUDGET' ? 'Orçamentos' : 'Ordens de Serviço';
  const icon = type === 'BUDGET' ? ClipboardList : FileText;
  const Icon = icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500">{list.length} registro(s)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Novo {type === 'BUDGET' ? 'Orçamento' : 'OS'}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nº, cliente, placa..."
          className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
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
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" /> Nenhum registro encontrado
                </td></tr>
              )}
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-petroleum-700 text-sm">#{String(o.number).padStart(4, '0')}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">{o.client?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} · ${o.vehicle.plate}` : '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(o.date)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{fmtCurrency(o.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setPdfItem(o)} title="Imprimir / PDF" className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleWhatsApp(o)} title="Enviar via WhatsApp" className="p-1.5 text-slate-400 hover:text-[#25D366] hover:bg-green-50 rounded-lg">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(o.id, o.number)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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

      {/* PDF Modal */}
      {pdfItem && (
        <Modal title={`${type === 'BUDGET' ? 'Orçamento' : 'OS'} #${String(pdfItem.number).padStart(4, '0')}`} onClose={() => setPdfItem(null)} size="xl">
          <OsPdf os={pdfItem} />
        </Modal>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <Modal title={`${modal === 'create' ? 'Novo' : 'Editar'} ${type === 'BUDGET' ? 'Orçamento' : 'OS'}`} onClose={() => setModal(null)} size="xl">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSave} className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                <select value={form.clientId} onChange={e => { F('clientId')(e); setForm(p => ({ ...p, vehicleId: '' })); }} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500">
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Veículo *</label>
                <select value={form.vehicleId} onChange={F('vehicleId')} required disabled={!form.clientId}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 disabled:opacity-50">
                  <option value="">Selecione...</option>
                  {clientVehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.plate}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={F('status')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            {type === 'OS' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Defeitos relatados pelo cliente</label>
                <textarea value={form.defectReported} onChange={F('defectReported')} rows={2} placeholder="Descreva os defeitos..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 resize-none" />
              </div>
            )}

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700 text-sm">Itens ({items.filter(i => i.description).length})</h3>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-petroleum-600 hover:text-petroleum-800 font-medium">
                  <Plus className="w-4 h-4" /> Adicionar item
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-0 bg-slate-50 text-xs font-bold text-slate-500 uppercase px-3 py-2.5">
                  <div className="col-span-4">Descrição</div>
                  <div className="col-span-2">Tipo</div>
                  <div className="col-span-1">Qtd</div>
                  <div className="col-span-2">Vlr Unit.</div>
                  <div className="col-span-2">Total</div>
                  <div className="col-span-1"></div>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-0 border-t border-slate-100 px-3 py-2 items-center">
                    <div className="col-span-4 pr-2 flex gap-1">
                      <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Descrição do serviço/peça"
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-petroleum-500" />
                      <button type="button" title="Selecionar do catálogo" onClick={() => { setCatalogPicker(i); setCatalogSearch(''); }}
                        className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg border border-slate-200 transition-colors">
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="col-span-2 pr-2">
                      <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-petroleum-500">
                        <option value="SERVICE">Serviço</option>
                        <option value="PART">Peça</option>
                      </select>
                    </div>
                    <div className="col-span-1 pr-2">
                      <input type="number" value={item.quantity} min={0.01} step="0.01" onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-petroleum-500 text-center" />
                    </div>
                    <div className="col-span-2 pr-2">
                      <input type="number" value={item.unitPrice} min={0} step="0.01" onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-petroleum-500" />
                    </div>
                    <div className="col-span-2 pr-2">
                      <span className="text-sm font-semibold text-slate-700">{fmtCurrency(Number(item.quantity) * Number(item.unitPrice))}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="p-1 text-slate-300 hover:text-red-500 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Técnico por item */}
                {type === 'OS' && items.map((item, i) => item.description && (
                  <div key={`tech-${i}`} className="grid grid-cols-12 gap-0 border-t border-slate-100/50 px-3 py-1.5 items-center bg-slate-50/50">
                    <div className="col-span-4 pl-1 text-xs text-slate-400">↳ {item.description || `Item ${i + 1}`}</div>
                    <div className="col-span-7 pr-2">
                      <select value={item.technicianId || ''} onChange={e => updateItem(i, 'technicianId', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-petroleum-500">
                        <option value="">Técnico responsável...</option>
                        {technicians.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                ))}
                <div className="border-t border-slate-200 px-3 py-3 flex justify-end">
                  <span className="text-sm font-bold text-slate-800">Total: {fmtCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
              <textarea value={form.notes} onChange={F('notes')} rows={2} placeholder="Observações adicionais..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 resize-none" />
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

      {/* Catalog Picker — renderizado por último para ficar acima de todos os modais */}
      {catalogPicker !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => { setCatalogPicker(null); setCatalogSearch(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Selecionar do Catálogo</h2>
              <button onClick={() => { setCatalogPicker(null); setCatalogSearch(''); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3 overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input autoFocus type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Buscar serviço ou peça..."
                  className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-72">
                {catalog.filter(c => c.description.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum item encontrado</div>
                )}
                {catalog.filter(c => c.description.toLowerCase().includes(catalogSearch.toLowerCase())).map(cat => (
                  <button key={cat.id} type="button" onClick={() => pickFromCatalog(catalogPicker, cat)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-petroleum-50 text-left transition-colors">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{cat.description}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {cat.type === 'SERVICE' ? 'Serviço' : 'Peça'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-petroleum-700 ml-4 shrink-0">{fmtCurrency(cat.unitPrice)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
