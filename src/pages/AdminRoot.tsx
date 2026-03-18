import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, ShieldCheck, LogOut, Phone, Mail, MapPin, UserCog, Eye, EyeOff, Users
} from 'lucide-react';
import api from '../lib/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import type { Empresa, TenantUser } from '../types';

interface EmpresaForm {
  nome: string; cnpj: string; endereco: string;
  telefone: string; email: string; observacao: string;
  cep: string; inscricao_estadual: string; contato: string;
  usuario: string; senha: string;
}

interface PerfilForm {
  nome: string; senhaAtual: string; novaSenha: string; confirmarSenha: string;
}

const emptyForm: EmpresaForm = {
  nome: '', cnpj: '', endereco: '', telefone: '',
  email: '', observacao: '', cep: '', inscricao_estadual: '', contato: '',
  usuario: '', senha: '',
};

const emptyPerfil: PerfilForm = { nome: '', senhaAtual: '', novaSenha: '', confirmarSenha: '' };

const fmtCnpj = (c: string) => {
  const n = String(c).replace(/\D/g, '');
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return c;
};

const fmtData = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export const AdminRoot = () => {
  const { logout, user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'perfil' | 'usuarios' | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm);
  const [perfil, setPerfil] = useState<PerfilForm>(emptyPerfil);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<TenantUser[]>([]);
  const [usuariosEmpresaNome, setUsuariosEmpresaNome] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/empresas');
      setEmpresas(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const F = (field: keyof EmpresaForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const P = (field: keyof PerfilForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setPerfil(p => ({ ...p, [field]: e.target.value }));

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setError('');
    setModal('create');
  };

  const openEdit = (emp: Empresa) => {
    setForm({
      nome: emp.nome, cnpj: emp.cnpj, endereco: emp.endereco || '',
      telefone: emp.telefone || '', email: emp.email || '',
      observacao: emp.observacao || '', cep: emp.cep || '',
      inscricao_estadual: emp.inscricao_estadual || '', contato: emp.contato || '',
      usuario: emp.usuario_admin, senha: '',
    });
    setEditId(emp.id);
    setError('');
    setModal('edit');
  };

  const openPerfil = () => {
    setPerfil({ ...emptyPerfil, nome: user?.name || '' });
    setError('');
    setModal('perfil');
  };

  const openUsuarios = async (emp: Empresa) => {
    setUsuariosEmpresaNome(emp.nome);
    setUsuariosEmpresa([]);
    setModal('usuarios');
    try {
      const { data } = await api.get(`/admin/empresas/${emp.id}/usuarios`);
      setUsuariosEmpresa(data);
    } catch {
      setUsuariosEmpresa([]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await api.post('/admin/empresas', form);
      } else {
        await api.put(`/admin/empresas/${editId}`, form);
      }
      setModal(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (perfil.novaSenha && perfil.novaSenha !== perfil.confirmarSenha) {
      setError('As senhas não coincidem'); return;
    }
    setSaving(true); setError('');
    try {
      await api.put('/admin/perfil', {
        nome: perfil.nome,
        senhaAtual: perfil.senhaAtual || undefined,
        novaSenha: perfil.novaSenha || undefined,
      });
      setModal(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (emp: Empresa) => {
    if (!confirm(`${emp.ativo ? 'Desativar' : 'Ativar'} a empresa "${emp.nome}"?`)) return;
    try {
      await api.patch(`/admin/empresas/${emp.id}/ativo`, { ativo: !emp.ativo });
      load();
    } catch { alert('Erro ao alterar status'); }
  };

  const handleDelete = async (emp: Empresa) => {
    if (!confirm(`Excluir a empresa "${emp.nome}"?\nEsta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/admin/empresas/${emp.id}`);
      load();
    } catch { alert('Erro ao excluir empresa'); }
  };

  const filtered = empresas.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search.replace(/\D/g, '')) ||
    (e.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-petroleum-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Painel Root</h1>
            <p className="text-xs text-slate-400">Gerenciamento de Empresas · V9 OS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
            <p className="text-xs text-amber-600 font-bold">Administrador Root</p>
          </div>
          <button onClick={openPerfil} title="Editar meu perfil"
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-xl transition-colors text-sm">
            <UserCog className="w-4 h-4" />
          </button>
          <button onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Empresas Cadastradas</h2>
            <p className="text-sm text-slate-500">{empresas.length} empresa(s) no sistema</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-petroleum-600 text-white rounded-xl font-bold text-sm hover:bg-petroleum-700 transition-colors shadow-md">
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
        </div>

        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, e-mail..."
            className="pl-10 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Cadastro</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Nenhuma empresa encontrada
                    </td>
                  </tr>
                )}
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-sm">{emp.nome}</div>
                      {emp.endereco && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3" /> {emp.endereco}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{fmtCnpj(emp.cnpj)}</td>
                    <td className="px-6 py-4">
                      {emp.telefone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="w-3 h-3" /> {emp.telefone}
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Mail className="w-3 h-3" /> {emp.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{fmtData(emp.data_cadastro)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                        emp.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {emp.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openUsuarios(emp)} title="Ver usuários"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleAtivo(emp)} title={emp.ativo ? 'Desativar' : 'Ativar'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            emp.ativo
                              ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                              : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                          }`}>
                          {emp.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(emp)}
                          className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
      </main>

      {/* Modal Criar/Editar Empresa */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
          onClose={() => setModal(null)}
          size="lg"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados da Empresa</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input type="text" value={form.nome} onChange={F('nome')} required
                placeholder="Razão social ou nome fantasia"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ / CPF *</label>
                <input type="text" value={form.cnpj} onChange={F('cnpj')}
                  required={modal === 'create'} disabled={modal === 'edit'}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input type="text" value={form.telefone} onChange={F('telefone')} placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={F('email')} placeholder="contato@empresa.com.br"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
              <input type="text" value={form.endereco} onChange={F('endereco')}
                placeholder="Rua, número, bairro, cidade - UF"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                <input type="text" value={form.cep} onChange={F('cep')} placeholder="00000-000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual</label>
                <input type="text" value={form.inscricao_estadual} onChange={F('inscricao_estadual')} placeholder="Nº Insc. Estadual"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contato (responsável)</label>
              <input type="text" value={form.contato} onChange={F('contato')} placeholder="Nome do responsável"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
              <textarea value={form.observacao} onChange={F('observacao')} rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 resize-none" />
            </div>

            {/* Acesso — obrigatório no cadastro, opcional (redefinir senha) na edição */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
              {modal === 'create' ? 'Acesso Inicial' : 'Acesso Admin'}
            </p>

            {modal === 'create' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usuário admin *</label>
                  <input type="text" value={form.usuario} onChange={F('usuario')} required placeholder="ex: admin"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha *</label>
                  <input type="text" value={form.senha} onChange={F('senha')} required placeholder="Senha inicial"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Usuário: <span className="font-mono text-petroleum-600">{form.usuario}</span>
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={form.senha} onChange={F('senha')}
                    placeholder="Nova senha (deixe em branco para manter)"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
                  <button type="button" onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Deixe em branco para não alterar a senha do admin.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 bg-petroleum-600 hover:bg-petroleum-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Usuários da Empresa */}
      {modal === 'usuarios' && (
        <Modal title={`Usuários — ${usuariosEmpresaNome}`} onClose={() => setModal(null)} size="lg">
          {usuariosEmpresa.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {usuariosEmpresa.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{u.nome}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{u.usuario}</td>
                      <td className="px-4 py-3 capitalize text-slate-500">{u.cargo}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Modal Perfil Root */}
      {modal === 'perfil' && (
        <Modal title="Meu Perfil" onClose={() => setModal(null)}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
          )}
          <form onSubmit={handleSavePerfil} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input type="text" value={perfil.nome} onChange={P('nome')} required placeholder="Seu nome"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-1">Alterar Senha</p>
            <p className="text-xs text-slate-400 -mt-2">Deixe em branco para não alterar a senha.</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha atual</label>
              <input type="password" value={perfil.senhaAtual} onChange={P('senhaAtual')}
                placeholder="Senha atual"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova senha</label>
                <input type="password" value={perfil.novaSenha} onChange={P('novaSenha')}
                  placeholder="Nova senha"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar</label>
                <input type="password" value={perfil.confirmarSenha} onChange={P('confirmarSenha')}
                  placeholder="Confirmar nova senha"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 bg-petroleum-600 hover:bg-petroleum-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
