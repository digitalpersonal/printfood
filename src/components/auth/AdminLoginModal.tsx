import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  UserCheck,
  Briefcase,
  User
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { MASTER_ADMIN_CREDENTIALS } from '../../data/initialData';
import { SystemUser } from '../../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user?: SystemUser) => void;
  targetTabName?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetTabName
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<SystemUser | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setLoading(true);

    try {
      const result = await supabaseService.login(email, password);
      if (result.success && result.user) {
        setLoggedInUser(result.user);
        
        // Se tentou entrar em uma aba restrita sendo apenas Atendente
        const isAdminTarget = targetTabName && (
          targetTabName.toLowerCase().includes('produto') || 
          targetTabName.toLowerCase().includes('relat') || 
          targetTabName.toLowerCase().includes('config')
        );

        if (isAdminTarget && result.user.role === 'atendente') {
          setWarning(
            'Seu perfil de Atendente tem acesso liberado apenas ao PDV (efetuar vendas e imprimir). As abas de Produtos e Relatórios exigem perfil de Caixa (Administrador) ou Administrador Geral.'
          );
          setSuccess(true);
          setTimeout(() => {
            if (onSuccess) onSuccess(result.user);
            onClose();
          }, 2400);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setPassword('');
          if (onSuccess) onSuccess(result.user);
          onClose();
        }, 800);
      } else {
        setError(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch {
      setError('Ocorreu um erro ao verificar suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: 'master' | 'caixa' | 'atendente') => {
    setError(null);
    setWarning(null);
    if (type === 'master') {
      setEmail(MASTER_ADMIN_CREDENTIALS.email);
      setPassword(MASTER_ADMIN_CREDENTIALS.password);
    } else if (type === 'caixa') {
      setEmail('caixa@printfood.com');
      setPassword('caixa123');
    } else {
      setEmail('atendente@printfood.com');
      setPassword('atendente123');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-white space-y-5 animate-in zoom-in-95">
        
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-950/40 shrink-0">
            <Lock className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Controle de Acesso
            </span>
            <h2 className="text-xl font-black text-white">
              Acesso de Atendentes & Caixas
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {targetTabName 
                ? `A área "${targetTabName}" requer permissão de Caixa (Administrador) ou Administrador Geral.`
                : 'Identifique-se com seu e-mail e senha para acessar o sistema.'}
            </p>
          </div>
        </div>

        {/* REGRAS DE PERMISSÃO RESUMIDAS */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-950/70 border border-neutral-800/80 p-2.5 rounded-2xl">
          <div className="flex items-start gap-2 text-neutral-300">
            <Briefcase className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Caixas (Administradores):</span>
              <p className="text-[10px] text-neutral-400">PDV, Produtos e Relatórios</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-neutral-300">
            <User className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Atendentes (Operação):</span>
              <p className="text-[10px] text-neutral-400">Apenas efetuar vendas e imprimir</p>
            </div>
          </div>
        </div>

        {/* STATUS / ALERTS */}
        {error && (
          <div className="p-3.5 bg-red-950/50 border border-red-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {warning && (
          <div className="p-3.5 bg-amber-950/50 border border-amber-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold block">Acesso restrito a vendas:</span>
              <span>{warning}</span>
            </div>
          </div>
        )}

        {success && !warning && (
          <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              Bem-vindo, <strong>{loggedInUser?.name}</strong>! Acesso ({loggedInUser?.role === 'caixa' ? 'Caixa / Administrador' : loggedInUser?.role === 'admin_geral' ? 'Administrador Geral' : 'Atendente PDV'}) autorizado.
            </span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* EMAIL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-orange-400" />
              <span>E-mail do Atendente / Caixa / Administrador:</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: caixa@printfood.com ou digitalpersonal@gmail.com"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition"
              />
            </div>
          </div>

          {/* SENHA */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-orange-400" />
              <span>Senha de Acesso:</span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha cadastrada"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 rounded-xl pl-3.5 pr-11 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* BOTÕES DE AUTO-PREENCHIMENTO PARA TESTES / DEMO */}
          <div className="pt-1">
            <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
              Preenchimento rápido (Conta Administrador Geral):
            </span>
            <div className="grid grid-cols-1">
              <button
                type="button"
                onClick={() => handleQuickFill('master')}
                className="p-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-left transition flex flex-col group"
                title="digitalpersonal@gmail.com"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-orange-400 group-hover:text-orange-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Administrador Geral (Clique para preencher)</span>
                </div>
                <span className="text-[10px] text-neutral-500 mt-0.5 font-mono">digitalpersonal@gmail.com</span>
              </button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-bold transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-800 text-white rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50"
            >
              {loading ? (
                <span>Validando acesso...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
