import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import type { Empresa } from '../types';

type Form = Omit<Partial<Empresa>, 'id' | 'ativo' | 'data_cadastro' | 'banco_dados' | 'usuario_admin'>;

const EMPTY: Form = {
  nome: '', cnpj: '', endereco: '', telefone: '', email: '',
  cep: '', inscricao_estadual: '', contato: '', observacao: '',
};

export const CompanySettings: React.FC = () => {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/empresa')
      .then(r => setForm({ ...EMPTY, ...r.data }))
      .catch(() => setError('Não foi possível carregar os dados da empresa.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(false); setSaving(true);
    try {
      await api.put('/empresa', form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-petroleum-300 border-t-petroleum-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-petroleum-600 p-2 rounded-xl">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dados da Empresa</h2>
          <p className="text-sm text-slate-500">Informações exibidas nos documentos emitidos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Razão Social / Nome <span className="text-red-500">*</span>
            </label>
            <input
              value={form.nome || ''}
              onChange={set('nome')}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">CNPJ / CPF</label>
            <input
              value={form.cnpj || ''}
              readOnly
              className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Inscrição Estadual</label>
            <input
              value={form.inscricao_estadual || ''}
              onChange={set('inscricao_estadual')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Telefone</label>
            <input
              value={form.telefone || ''}
              onChange={set('telefone')}
              placeholder="(00) 0000-0000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">E-mail</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={set('email')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Nome do Contato</label>
            <input
              value={form.contato || ''}
              onChange={set('contato')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">CEP</label>
            <input
              value={form.cep || ''}
              onChange={set('cep')}
              placeholder="00000-000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Endereço</label>
            <input
              value={form.endereco || ''}
              onChange={set('endereco')}
              placeholder="Rua, número, bairro, cidade - UF"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Observações</label>
            <textarea
              value={form.observacao || ''}
              onChange={set('observacao')}
              rows={3}
              placeholder="Informações adicionais exibidas nos documentos..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-400 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Dados salvos com sucesso!
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-petroleum-600 hover:bg-petroleum-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Dados'}
          </button>
        </div>
      </form>
    </div>
  );
};
