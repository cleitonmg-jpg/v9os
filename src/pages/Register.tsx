import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, Building2, User, Lock, Phone, Mail, MapPin, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../lib/api';

interface RegForm {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  observacao: string;
  usuario: string;
  senha: string;
  confirmarSenha: string;
}

const empty: RegForm = {
  nome: '', cnpj: '', endereco: '', telefone: '',
  email: '', observacao: '', usuario: '', senha: '', confirmarSenha: '',
};

export const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegForm>(empty);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [cnpjCadastrado, setCnpjCadastrado] = useState('');

  const F = (field: keyof RegForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.senha !== form.confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }
    if (form.senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { confirmarSenha, ...payload } = form;
      await api.post('/register', payload);
      setCnpjCadastrado(form.cnpj);
      setSucesso(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar empresa');
    } finally {
      setLoading(false);
    }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-petroleum-950 via-petroleum-900 to-petroleum-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Empresa cadastrada!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Sua empresa foi cadastrada com sucesso. Use o CNPJ e o usuário criado para entrar no sistema.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 space-y-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dados de acesso</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">CNPJ:</span> {cnpjCadastrado}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">Usuário:</span> {form.usuario}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-petroleum-600 hover:bg-petroleum-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Ir para o login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário de cadastro ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-petroleum-950 via-petroleum-900 to-petroleum-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-3 border border-white/20">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">V9 OS</h1>
          <p className="text-petroleum-200 mt-1 text-sm">Cadastro de Nova Empresa</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Cadastrar empresa</h2>
          <p className="text-xs text-slate-400 mb-6">
            Preencha os dados abaixo para criar acesso ao sistema.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dados da empresa */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-1">Dados da Empresa</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Empresa *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={form.nome} onChange={F('nome')} required placeholder="Razão social ou nome fantasia"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ / CPF *</label>
                <input type="text" value={form.cnpj} onChange={F('cnpj')} required placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={form.telefone} onChange={F('telefone')} placeholder="(00) 00000-0000"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" value={form.email} onChange={F('email')} placeholder="contato@empresa.com.br"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={form.endereco} onChange={F('endereco')} placeholder="Rua, número, bairro, cidade - UF"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Observação</label>
              <textarea value={form.observacao} onChange={F('observacao')} rows={2} placeholder="Informações adicionais..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500 resize-none" />
            </div>

            {/* Dados de acesso */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Acesso do Administrador</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome de usuário *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={form.usuario} onChange={F('usuario')} required placeholder="ex: admin"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showPass ? 'text' : 'password'} value={form.senha} onChange={F('senha')} required placeholder="Mín. 6 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar senha *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showPass ? 'text' : 'password'} value={form.confirmarSenha} onChange={F('confirmarSenha')} required placeholder="Repita a senha"
                    className="w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-petroleum-600 hover:bg-petroleum-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors mt-2"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Já tem acesso?{' '}
              <Link to="/login" className="text-petroleum-600 hover:text-petroleum-800 font-semibold">
                Entrar no sistema
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-petroleum-300 text-xs mt-6">V9 INFORMÁTICA LTDA · (37) 4141-0341</p>
      </div>
    </div>
  );
};
