import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { Order, Business, OrderStatus } from '../../types';
import { Bell, CheckCircle } from 'lucide-react';
import { playBeep } from '../../lib/sound';

interface PickupBoardViewProps {
  business: Business | null;
}

export const PickupBoardView: React.FC<PickupBoardViewProps> = ({ business }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!business) return;

    // Load initial orders (today)
    supabaseService.getTodayOrders(business.id).then(data => {
      setOrders(data.filter(o => o.order_status !== 'entregue' && o.order_status !== 'cancelado'));
    });

    // Local events listener for demo / fallback mode
    const handleLocalOrderCreated = (e: Event) => {
      const customEv = e as CustomEvent<Order>;
      if (customEv.detail) {
        playBeep();
        setOrders(prev => [customEv.detail, ...prev]);
      }
    };

    const handleLocalOrderUpdated = (e: Event) => {
      const customEv = e as CustomEvent<{ id: string; status: string }>;
      if (customEv.detail) {
        const { id, status } = customEv.detail;
        if (status === 'entregue' || status === 'cancelado') {
          setOrders(prev => prev.filter(o => o.id !== id));
        } else {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, order_status: status } : o));
        }
      }
    };

    window.addEventListener('printfood:order-created', handleLocalOrderCreated);
    window.addEventListener('printfood:order-updated', handleLocalOrderUpdated);

    // Realtime subscription (Supabase)
    let channel: any = null;
    if (supabase && typeof supabase.channel === 'function') {
      try {
        channel = supabase
          .channel('public:orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
            const newOrder = payload.new as Order;
            if (payload.eventType === 'INSERT') {
              playBeep();
              setOrders(prev => [newOrder, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              if (newOrder.order_status === 'entregue' || newOrder.order_status === 'cancelado') {
                setOrders(prev => prev.filter(o => o.id !== newOrder.id));
              } else {
                setOrders(prev => prev.map(o => o.id === newOrder.id ? newOrder : o));
              }
            }
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription not active:', err);
      }
    }

    return () => {
      window.removeEventListener('printfood:order-created', handleLocalOrderCreated);
      window.removeEventListener('printfood:order-updated', handleLocalOrderUpdated);
      if (channel && supabase && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [business]);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      await supabaseService.updateOrderStatus(id, newStatus);
      
      if (newStatus === 'pronto') {
        // Double beep for ready
        playBeep();
        setTimeout(playBeep, 200);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const pending = orders.filter(o => o.order_status === 'pago');
  const preparing = orders.filter(o => o.order_status === 'preparando');
  const ready = orders.filter(o => o.order_status === 'pronto');

  return (
    <div className="flex-1 p-6 flex gap-6 overflow-hidden bg-neutral-950">
      
      {/* COLUMN: A FAZER */}
      <div className="flex-1 flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 text-center">
          <h2 className="font-black text-xl text-neutral-300">A Fazer ({pending.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pending.map(o => (
            <div key={o.id} className="bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-black text-white">#{o.ticket_number}</span>
                <button 
                  onClick={() => updateStatus(o.id, 'preparando')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm"
                >
                  Preparar
                </button>
              </div>
              {o.customer_name && <div className="text-sm font-bold text-neutral-400">{o.customer_name}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* COLUMN: PREPARANDO */}
      <div className="flex-1 flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        <div className="p-4 bg-sky-950 border-b border-sky-900 text-center">
          <h2 className="font-black text-xl text-sky-400">Preparando ({preparing.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {preparing.map(o => (
            <div key={o.id} className="bg-sky-950/30 border border-sky-900/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-black text-sky-400">#{o.ticket_number}</span>
                <button 
                  onClick={() => updateStatus(o.id, 'pronto')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm"
                >
                  Pronto
                </button>
              </div>
              {o.customer_name && <div className="text-sm font-bold text-sky-200/50">{o.customer_name}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* COLUMN: PRONTO (CHAMADA) */}
      <div className="flex-1 flex flex-col bg-neutral-900 border border-emerald-900 rounded-3xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <div className="p-4 bg-emerald-950 border-b border-emerald-900 text-center">
          <h2 className="font-black text-xl text-emerald-400">Pronto / Chamar ({ready.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ready.map(o => (
            <div key={o.id} className="bg-emerald-600 rounded-2xl p-4 shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl font-black">#{o.ticket_number}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { playBeep(); setTimeout(playBeep, 200); }}
                    className="w-12 h-12 bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center justify-center"
                  >
                    <Bell className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => updateStatus(o.id, 'entregue')}
                    className="w-12 h-12 bg-emerald-950 hover:bg-neutral-900 text-emerald-400 rounded-xl flex items-center justify-center"
                  >
                    <CheckCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              {o.customer_name && <div className="text-lg font-bold text-emerald-100">{o.customer_name}</div>}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
