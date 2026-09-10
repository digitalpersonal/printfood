import React from 'react';
import { 
  Store, 
  ShoppingBag, 
  Clock, 
  BarChart3, 
  Sliders, 
  UtensilsCrossed, 
  ShieldCheck, 
  Lock, 
  LogOut,
  Briefcase,
  User
} from 'lucide-react';
import { Business, AdminUser, SystemUser } from '../../types';
import { PrintFoodLogo } from '../common/PrintFoodLogo';

export type NavTab = 'pdv' | 'retirada' | 'produtos' | 'admin' | 'configuracoes';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  business: Business | null;
  adminUser?: AdminUser | null;
  currentUser?: SystemUser | null;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  onSelectTab, 
  business,
  adminUser,
  currentUser,
  onOpenAdminLogin,
  onAdminLogout
}) => {
  // Usuário é admin se for Admin Geral ou Caixa (pois caixas são administradores)
  const isAuthorizedAdmin = currentUser?.role === 'admin_geral' || currentUser?.role === 'caixa' || !!adminUser;

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-40 select-none shadow-md">
      {/* STATUS BAR */}
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between text-xs border-b border-neutral-800/60 text-neutral-400">
        <div className="flex items-center gap-2 font-semibold text-neutral-200">
          <Store className="w-3.5 h-3.5 text-orange-500" />
          <span className="truncate max-w-[200px]">{business?.name || 'PrintFood'}</span>
        </div>

        {/* USUÁRIO ATUAL / STATUS / AÇÃO DE LOGIN */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 px-2.5 py-0.5 rounded-full text-[11px]">
              {currentUser.role === 'admin_geral' && (
                <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Geral:</span>
                  <span className="text-white font-mono">{currentUser.email}</span>
                </div>
              )}

              {currentUser.role === 'caixa' && (
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Caixa (Admin):</span>
                  <span className="text-white font-semibold">{currentUser.name}</span>
                </div>
              )}

              {currentUser.role === 'atendente' && (
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Atendente PDV:</span>
                  <span className="text-white font-semibold">{currentUser.name}</span>
                  <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded hidden md:inline">Apenas Vendas</span>
                </div>
              )}

              <button
                type="button"
                onClick={onAdminLogout}
                className="text-neutral-400 hover:text-red-400 transition pl-1 border-l border-neutral-800 flex items-center gap-1"
                title="Trocar de operador ou sair da sessão"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden md:inline">Sair / Trocar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1.5 text-neutral-300 hover:text-orange-400 font-semibold bg-neutral-800 hover:bg-neutral-750 px-2.5 py-0.5 rounded-full border border-neutral-700/60 transition text-[11px]"
              title="Acessar com e-mail e senha de Atendente, Caixa ou Administrador Geral"
            >
              <Lock className="w-3 h-3 text-orange-500" />
              <span>Login Atendente / Caixa / Admin</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistema Operacional
          </div>
        </div>
      </div>

      {/* MAIN NAV */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* BRAND */}
        <div className="shrink-0">
          <PrintFoodLogo size="sm" />
        </div>

        {/* TABS */}
        <nav className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectTab('pdv')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition ${
              currentTab === 'pdv'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Vendas (PDV)</span>
          </button>

          <button
            onClick={() => onSelectTab('retirada')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition ${
              currentTab === 'retirada'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Retirada</span>
          </button>

          <button
            onClick={() => onSelectTab('produtos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition ${
              currentTab === 'produtos'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Produtos</span>
            {!isAuthorizedAdmin && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition ${
              currentTab === 'admin'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Relatórios</span>
            {!isAuthorizedAdmin && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectTab('configuracoes')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition ${
              currentTab === 'configuracoes'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Configurações</span>
            {!isAuthorizedAdmin && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
          </button>
        </nav>
      </div>
    </header>
  );
};
