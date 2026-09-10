import React, { useState } from 'react';
import { Order } from '../../types';
import { Filter } from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
  formatMoney: (val: number) => string;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, formatMoney }) => {
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'todos' | 'approved' | 'pending'>('todos');

  const filteredOrders = orders
    .filter(o => paymentStatusFilter === 'todos' || o.payment_status === paymentStatusFilter)
    .slice(0, 50);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-black text-white">Histórico de Pedidos (Últimas 50)</h3>
        <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <Filter className="w-4 h-4 text-orange-500 ml-2" />
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
            className="bg-transparent text-xs font-bold text-neutral-300 p-1 outline-none"
          >
            <option value="todos">Todos os Status</option>
            <option value="approved">Aprovados</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500 uppercase font-bold text-xs">
            <tr>
              <th className="pb-3 border-b border-neutral-800">Ficha</th>
              <th className="pb-3 border-b border-neutral-800">Data/Hora</th>
              <th className="pb-3 border-b border-neutral-800">Pagamento</th>
              <th className="pb-3 border-b border-neutral-800">Status</th>
              <th className="pb-3 border-b border-neutral-800 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="text-neutral-300">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs">Nenhum pedido encontrado.</td>
              </tr>
            ) : (
              filteredOrders.map(o => (
                <tr key={o.id} className="border-b border-neutral-800/50">
                  <td className="py-3 font-bold text-white">#{o.ticket_number}</td>
                  <td className="py-3 text-xs text-neutral-400">
                    {new Date(o.created_at || Date.now()).toLocaleDateString('pt-BR')} 
                    {' '}
                    {new Date(o.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 font-bold uppercase text-xs">{o.payment_method}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      o.payment_status === 'approved' ? 'bg-emerald-950 text-emerald-500' : 'bg-amber-950 text-amber-500'
                    }`}>
                      {o.payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-right font-black">{formatMoney(o.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
