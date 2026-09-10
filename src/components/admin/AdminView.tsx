import React, { useEffect, useState } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { Business, Order } from '../../types';
import { DollarSign, ShoppingBag, TrendingUp, UtensilsCrossed, ArrowRight, Printer, Filter } from 'lucide-react';

interface AdminViewProps {
  business: Business | null;
  onNavigateToProducts?: () => void;
}

type PeriodType = 'dia' | 'semana' | 'mes' | 'turno_manha' | 'turno_tarde' | 'turno_noite';

export const AdminView: React.FC<AdminViewProps> = ({ business, onNavigateToProducts }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('dia');
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string | null>(null);

  const fetchOrders = () => {
    if (!business) return;
    supabaseService.getAllOrders(business.id).then(data => {
      setOrders(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => fetchOrders();
    window.addEventListener('printfood:order-created', handleUpdate);
    window.addEventListener('printfood:order-updated', handleUpdate);

    return () => {
      window.removeEventListener('printfood:order-created', handleUpdate);
      window.removeEventListener('printfood:order-updated', handleUpdate);
    };
  }, [business]);

  // Filter orders based on selected period
  const filterOrdersByPeriod = (allOrders: Order[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return allOrders.filter(o => {
      const oDate = new Date(o.created_at || Date.now());
      const oTime = oDate.getTime();
      const oHour = oDate.getHours();

      if (o.order_status === 'cancelado' || o.payment_status !== 'approved') {
        return false;
      }

      if (period === 'dia') {
        return oTime >= todayStart;
      }
      if (period === 'semana') {
        const weekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
        return oTime >= weekAgo;
      }
      if (period === 'mes') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return oTime >= monthStart;
      }
      if (period === 'turno_manha') {
        return oTime >= todayStart && oHour >= 6 && oHour < 14;
      }
      if (period === 'turno_tarde') {
        return oTime >= todayStart && oHour >= 14 && oHour < 22;
      }
      if (period === 'turno_noite') {
        return oTime >= todayStart && (oHour >= 22 || oHour < 6);
      }
      return true;
    });
  };

  const filteredOrders = filterOrdersByPeriod(orders);
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const ticketMedio = filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;

  // Breakdown by payment method
  const paymentBreakdown = filteredOrders.reduce((acc: Record<string, { count: number; total: number }>, o) => {
    const method = o.payment_method || 'outros';
    if (!acc[method]) acc[method] = { count: 0, total: 0 };
    acc[method].count += 1;
    acc[method].total += o.total;
    return acc;
  }, {});

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const getPeriodLabel = () => {
    switch (period) {
      case 'dia': return 'Fechamento do Dia (Hoje)';
      case 'semana': return 'Fechamento da Semana (Últimos 7 Dias)';
      case 'mes': return 'Fechamento do Mês Atual';
      case 'turno_manha': return 'Fechamento por Turno - Manhã (06h - 14h)';
      case 'turno_tarde': return 'Fechamento por Turno - Tarde (14h - 22h)';
      case 'turno_noite': return 'Fechamento por Turno - Noite/Madrugada (22h - 06h)';
    }
  };

  const handlePrintClosure = () => {
    window.print();
    setPrintSuccessMsg('Janela de impressão de fechamento aberta com sucesso!');
    setTimeout(() => setPrintSuccessMsg(null), 4000);
  };

  if (loading) {
    return <div className="p-8 text-neutral-400 font-bold">Carregando painel administrativo...</div>;
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-neutral-950">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Fechamento & Relatórios</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Analise o desempenho de vendas por turno, dia, semana ou mês.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrintClosure}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-black transition shadow-lg shadow-orange-950/50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Fechamento</span>
            </button>

            {onNavigateToProducts && (
              <button
                type="button"
                onClick={onNavigateToProducts}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-orange-400 rounded-2xl text-xs font-black transition"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Cardápio</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            )}
          </div>
        </div>

        {printSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
            <span>{printSuccessMsg}</span>
          </div>
        )}

        {/* PERIOD SELECTOR TABS */}
        <div className="flex flex-wrap items-center gap-2 bg-neutral-900 p-2 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-400 border-r border-neutral-800">
            <Filter className="w-3.5 h-3.5 text-orange-500" />
            <span>Período:</span>
          </div>
          <button
            onClick={() => setPeriod('dia')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${period === 'dia' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Dia (Hoje)
          </button>
          <button
            onClick={() => setPeriod('turno_manha')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${period === 'turno_manha' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Turno Manhã
          </button>
          <button
            onClick={() => setPeriod('turno_tarde')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${period === 'turno_tarde' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Turno Tarde
          </button>
          <button
            onClick={() => setPeriod('turno_noite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${period === 'turno_noite' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Turno Noite
          </button>
          <button
            onClick={() => setPeriod('semana')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${period === 'semana' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('mes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${period === 'mes' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Mês
          </button>
        </div>

        <div className="text-sm font-bold text-orange-400 uppercase tracking-wider">
          {getPeriodLabel()}
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-orange-500 mb-2">
              <DollarSign className="w-6 h-6" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Faturamento do Período</h3>
            </div>
            <div className="text-4xl font-black text-white">{formatMoney(totalSales)}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-500 mb-2">
              <ShoppingBag className="w-6 h-6" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Total de Vendas</h3>
            </div>
            <div className="text-4xl font-black text-white">{filteredOrders.length}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sky-500 mb-2">
              <TrendingUp className="w-6 h-6" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Ticket Médio</h3>
            </div>
            <div className="text-4xl font-black text-white">{formatMoney(ticketMedio)}</div>
          </div>
        </div>

        {/* PAYMENT METHOD BREAKDOWN */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-black text-white mb-4">Formas de Pagamento no Período</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.keys(paymentBreakdown).length === 0 ? (
              <div className="text-xs text-neutral-500 col-span-full py-4 text-center">Nenhuma venda registrada neste período.</div>
            ) : (
              Object.entries(paymentBreakdown).map(([method, data]) => (
                <div key={method} className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold uppercase text-neutral-400">{method}</div>
                  <div className="text-lg font-black text-white mt-1">{formatMoney(data.total)}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{data.count} {data.count === 1 ? 'venda' : 'vendas'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ORDERS LIST */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-white mb-4">Fichas Registradas ({filteredOrders.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500 uppercase font-bold text-xs">
                <tr>
                  <th className="pb-3 border-b border-neutral-800">Ficha</th>
                  <th className="pb-3 border-b border-neutral-800">Horário</th>
                  <th className="pb-3 border-b border-neutral-800">Status</th>
                  <th className="pb-3 border-b border-neutral-800">Pagamento</th>
                  <th className="pb-3 border-b border-neutral-800">Cliente</th>
                  <th className="pb-3 border-b border-neutral-800 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="text-neutral-300">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500 text-xs">Nenhum pedido encontrado para este filtro.</td>
                  </tr>
                ) : (
                  filteredOrders.map(o => (
                    <tr key={o.id} className="border-b border-neutral-800/50">
                      <td className="py-3 font-bold text-white">#{o.ticket_number}</td>
                      <td className="py-3 text-xs text-neutral-400">{new Date(o.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          o.order_status === 'cancelado' ? 'bg-red-950 text-red-500' :
                          o.order_status === 'entregue' ? 'bg-neutral-800 text-neutral-500' :
                          'bg-emerald-950 text-emerald-500'
                        }`}>
                          {o.order_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 font-bold uppercase text-xs">{o.payment_method}</td>
                      <td className="py-3">{o.customer_name || '-'}</td>
                      <td className="py-3 text-right font-black">{formatMoney(o.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* HIDDEN THERMAL PRINTABLE CLOSURE REPORT */}
      <div className="hidden">
        <div id="printfood-closure-printable" className="bg-white text-neutral-900 p-4 font-mono text-xs w-[80mm]">
          <div className="text-center border-b border-dashed border-neutral-400 pb-3 mb-3">
            <div className="text-xl font-black uppercase text-neutral-950 font-['Plus_Jakarta_Sans',sans-serif]">
              PRINT<span className="text-orange-600">FOOD</span>
            </div>
            <div className="text-xs font-bold uppercase text-neutral-800 mt-1">FECHAMENTO DE CAIXA</div>
            <div className="text-[11px] font-bold text-neutral-700">{business?.name || 'Caixa Central'}</div>
            <div className="text-[10px] text-neutral-600 uppercase mt-1 font-black">{getPeriodLabel()}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Emitido em: {new Date().toLocaleString('pt-BR')}</div>
          </div>

          <div className="space-y-1.5 border-b border-dashed border-neutral-400 pb-3 mb-3">
            <div className="flex justify-between font-bold">
              <span>TOTAL DE VENDAS:</span>
              <span>{filteredOrders.length}</span>
            </div>
            <div className="flex justify-between font-black text-sm">
              <span>FATURAMENTO:</span>
              <span>{formatMoney(totalSales)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>TICKET MÉDIO:</span>
              <span>{formatMoney(ticketMedio)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-neutral-400 pb-3 mb-3 space-y-1">
            <div className="text-[10px] font-black uppercase text-neutral-700 mb-1">POR FORMA DE PAGAMENTO:</div>
            {Object.entries(paymentBreakdown).map(([method, data]) => (
              <div key={method} className="flex justify-between text-[11px]">
                <span className="uppercase">{method} ({data.count}x):</span>
                <span className="font-bold">{formatMoney(data.total)}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-2 text-[10px] font-bold text-neutral-700">
            *** FIM DO RELATÓRIO DE FECHAMENTO ***
          </div>
          <div className="mt-8 pt-4 border-t border-neutral-400 text-center text-[9px] text-neutral-500">
            Assinatura do Operador / Gerente
          </div>
        </div>
      </div>

    </div>
  );
};
