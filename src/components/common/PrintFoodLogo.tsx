import React from 'react';
import { Printer, UtensilsCrossed, Sparkles } from 'lucide-react';

interface PrintFoodLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const PrintFoodLogo: React.FC<PrintFoodLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Compact Logo Icon */}
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 p-0.5 shadow-md shadow-orange-950/40 shrink-0">
          <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-amber-500/10" />
            <Printer className="w-4 h-4 text-orange-400 relative z-10" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <UtensilsCrossed className="w-2 h-2 text-neutral-950" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="leading-tight">
          <div className="flex items-center gap-0.5 text-base font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
            <span>Print</span>
            <span className="text-orange-500">Food</span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase block -mt-0.5">
              PDV & Fichas
            </span>
          )}
        </div>
      </div>
    );
  }

  if (size === 'lg' || size === 'xl') {
    const isXl = size === 'xl';
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {/* Emblema / Logomarca grande */}
        <div className="relative mb-5 group">
          {/* Glow de fundo */}
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500" />
          
          {/* Container do ícone */}
          <div className={`${isXl ? 'w-24 h-24' : 'w-20 h-20'} relative rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-600 p-[2px] shadow-2xl shadow-orange-950/60`}>
            <div className="w-full h-full bg-neutral-950 rounded-[22px] flex flex-col items-center justify-center relative overflow-hidden">
              {/* Brilho interno sutil */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/30 via-transparent to-transparent" />
              
              <div className="relative z-10 flex items-center justify-center">
                <Printer className={`${isXl ? 'w-10 h-10' : 'w-8 h-8'} text-white drop-shadow-md`} />
              </div>

              {/* Tag de Ticket / Comida saindo */}
              <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-neutral-950 font-black text-[9px] shadow-sm tracking-wider uppercase">
                <UtensilsCrossed className="w-2.5 h-2.5" />
                <span>FICHA</span>
              </div>
            </div>

            {/* Sparkle badge no canto */}
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shadow-md animate-pulse">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
        </div>

        {/* Nome da Marca com Tipografia Elegante */}
        <div className="flex items-center justify-center gap-1 font-['Plus_Jakarta_Sans',sans-serif]">
          <span className={`${isXl ? 'text-4xl' : 'text-3xl'} font-black tracking-tight text-white`}>
            Print
          </span>
          <span className={`${isXl ? 'text-4xl' : 'text-3xl'} font-black tracking-tight bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent`}>
            Food
          </span>
        </div>

        {showSubtitle && (
          <p className="text-xs sm:text-sm text-neutral-400 font-medium mt-1 tracking-wide">
            Sistema Ágil de Vendas & Emissão de Fichas
          </p>
        )}
      </div>
    );
  }

  // Medium (default)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon Badge */}
      <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 p-[1.5px] shadow-lg shadow-orange-950/40 shrink-0">
        <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent" />
          <Printer className="w-5 h-5 text-orange-400 relative z-10" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow">
            <UtensilsCrossed className="w-2.5 h-2.5 text-neutral-950" />
          </div>
        </div>
      </div>

      {/* Brand Text */}
      <div className="leading-tight">
        <div className="flex items-center gap-0.5 text-xl font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
          <span>Print</span>
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Food</span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] text-neutral-400 font-semibold tracking-wider uppercase block">
            Vendas & Fichas em Tempo Real
          </span>
        )}
      </div>
    </div>
  );
};
