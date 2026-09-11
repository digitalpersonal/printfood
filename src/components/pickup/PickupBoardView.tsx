import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { Order, Business, OrderStatus } from '../../types';
import { Bell, CheckCircle, Tv, LayoutDashboard, Volume2, VolumeX } from 'lucide-react';
import { playBeep } from '../../lib/sound';

interface PickupBoardViewProps {
  business: Business | null;
}

export const PickupBoardView: React.FC<PickupBoardViewProps> = ({ business }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewMode, setViewMode] = useState<'kds' | 'tv'>('kds');
  const [lastCalledTicket, setLastCalledTicket] = useState<string | null>(null);
  const [showCallAlert, setShowCallAlert] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Trigger sound/voice call for ready ticket
  const triggerTicketCall = (ticketNumber: string) => {
    setLastCalledTicket(ticketNumber);
    setShowCallAlert(true);

    if (soundEnabled) {
      if ('speechSynthesis' in window) {
        // Stop current speaking to avoid queue buildup
        window.speechSynthesis.cancel();
        
        // Custom elegant message in Brazilian Portuguese
        const utterance = new SpeechSynthesisUtterance(`Senha número ${ticketNumber}, pronto para retirada.`);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback to high quality double beep
        playBeep();
        setTimeout(playBeep, 200);
      }
    }

    // Auto close alert after 6 seconds
    const timer = setTimeout(() => {
      setShowCallAlert(false);
    }, 6000);
    return () => clearTimeout(timer);
  };

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
        if (soundEnabled && viewMode === 'kds') {
          playBeep();
        }
        setOrders(prev => {
          // Prevent duplicates
          if (prev.some(o => o.id === customEv.detail.id)) return prev;
          return [customEv.detail, ...prev];
        });
      }
    };

    const handleLocalOrderUpdated = (e: Event) => {
      const customEv = e as CustomEvent<{ id: string; status: string }>;
      if (customEv.detail) {
        const { id, status } = customEv.detail;
        
        setOrders(prev => {
          const oldOrder = prev.find(o => o.id === id);
          if (oldOrder && oldOrder.order_status !== 'pronto' && status === 'pronto') {
            triggerTicketCall(oldOrder.ticket_number);
          }
          
          if (status === 'entregue' || status === 'cancelado') {
            return prev.filter(o => o.id !== id);
          } else {
            return prev.map(o => o.id === id ? { ...o, order_status: status as OrderStatus } : o);
          }
        });
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
              if (soundEnabled && viewMode === 'kds') {
                playBeep();
              }
              setOrders(prev => {
                if (prev.some(o => o.id === newOrder.id)) return prev;
                return [newOrder, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              if (newOrder.order_status === 'entregue' || newOrder.order_status === 'cancelado') {
                setOrders(prev => prev.filter(o => o.id !== newOrder.id));
              } else {
                setOrders(prev => {
                  const oldOrder = prev.find(o => o.id === newOrder.id);
                  if (oldOrder && oldOrder.order_status !== 'pronto' && newOrder.order_status === 'pronto') {
                    triggerTicketCall(newOrder.ticket_number);
                  }
                  return prev.map(o => o.id === newOrder.id ? newOrder : o);
                });
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
  }, [business, soundEnabled, viewMode]);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      await supabaseService.updateOrderStatus(id, newStatus);
      
      if (newStatus === 'pronto') {
        const order = orders.find(o => o.id === id);
        if (order) {
          triggerTicketCall(order.ticket_number);
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const pending = orders.filter(o => o.order_status === 'pago');
  const preparing = orders.filter(o => o.order_status === 'preparando');
  const ready = orders.filter(o => o.order_status === 'pronto');

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
      
      {/* SELECTION BAR / CONTROL HEADER */}
      <div className="px-6 py-3 bg-neutral-900 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl">
            {viewMode === 'kds' ? <LayoutDashboard className="w-5 h-5" /> : <Tv className="w-5 h-5 animate-pulse" />}
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">
              {viewMode === 'kds' ? 'Controle de Preparação' : 'Painel de Senhas (TV Cliente)'}
            </h1>
            <p className="text-xs text-neutral-400">
              {viewMode === 'kds' 
                ? 'Painel operacional para mover pedidos e chamar clientes' 
                : 'Exibição em tempo real para TV instalada no salão'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-bold ${
              soundEnabled 
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900/40' 
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
            }`}
            title={soundEnabled ? 'Chamada por Voz Ativa' : 'Mudo'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'Chamada Ativa' : 'Mudo'}</span>
          </button>

          {/* Mode Switchers */}
          <div className="bg-neutral-950 p-1 rounded-xl border border-neutral-800 flex gap-1">
            <button
              onClick={() => setViewMode('kds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === 'kds'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Cozinha / KDS</span>
            </button>
            <button
              onClick={() => setViewMode('tv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === 'tv'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV do Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODES RENDERING */}
      <div className="flex-1 overflow-hidden flex relative">
        
        {/* MODE 1: OPERATIONAL KDS */}
        {viewMode === 'kds' ? (
          <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
            
            {/* COLUMN: A FAZER */}
            <div className="flex-1 flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
              <div className="p-4 bg-neutral-950 border-b border-neutral-800 text-center">
                <h2 className="font-black text-lg text-neutral-300 uppercase tracking-wider">A Fazer ({pending.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pending.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <p className="text-xs text-neutral-500 font-bold">Sem pedidos aguardando</p>
                  </div>
                ) : (
                  pending.map(o => (
                    <div key={o.id} className="bg-neutral-850 rounded-2xl p-4 shadow-sm border border-neutral-750 transition hover:border-neutral-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-black text-white font-mono">#{o.ticket_number}</span>
                        <button 
                          onClick={() => updateStatus(o.id, 'preparando')}
                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs transition active:scale-95"
                        >
                          Preparar
                        </button>
                      </div>
                      {o.customer_name && <div className="text-xs font-black text-neutral-400 uppercase tracking-wide">{o.customer_name}</div>}
                      <div className="text-[10px] text-neutral-500 font-bold mt-1">
                        {new Date(o.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN: PREPARANDO */}
            <div className="flex-1 flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
              <div className="p-4 bg-sky-950/40 border-b border-sky-900/50 text-center">
                <h2 className="font-black text-lg text-sky-400 uppercase tracking-wider">Preparando ({preparing.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {preparing.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <p className="text-xs text-neutral-500 font-bold">Sem pedidos em preparo</p>
                  </div>
                ) : (
                  preparing.map(o => (
                    <div key={o.id} className="bg-sky-950/10 border border-sky-900/40 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-black text-sky-400 font-mono">#{o.ticket_number}</span>
                        <button 
                          onClick={() => updateStatus(o.id, 'pronto')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs transition active:scale-95"
                        >
                          Pronto
                        </button>
                      </div>
                      {o.customer_name && <div className="text-xs font-black text-sky-300 uppercase tracking-wide">{o.customer_name}</div>}
                      <div className="text-[10px] text-sky-500 font-bold mt-1">
                        Em preparo
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN: PRONTO (CHAMADA) */}
            <div className="flex-1 flex flex-col bg-neutral-900 border border-emerald-950 rounded-3xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="p-4 bg-emerald-950/40 border-b border-emerald-900/50 text-center">
                <h2 className="font-black text-lg text-emerald-400 uppercase tracking-wider">Pronto / Chamar ({ready.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {ready.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <p className="text-xs text-neutral-500 font-bold">Nenhum pedido pronto para entrega</p>
                  </div>
                ) : (
                  ready.map(o => (
                    <div key={o.id} className="bg-emerald-900/30 border border-emerald-800/40 rounded-2xl p-4 shadow-lg text-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl font-black font-mono text-emerald-400">#{o.ticket_number}</span>
                        <div className="flex gap-1.5">
                          {/* Recall button */}
                          <button 
                            onClick={() => triggerTicketCall(o.ticket_number)}
                            className="w-10 h-10 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition active:scale-95"
                            title="Re-chamar Senha"
                          >
                            <Bell className="w-5 h-5" />
                          </button>
                          {/* Deliver button */}
                          <button 
                            onClick={() => updateStatus(o.id, 'entregue')}
                            className="w-10 h-10 bg-emerald-550 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center transition active:scale-95"
                            title="Entregar Pedido"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {o.customer_name && <div className="text-xs font-black text-emerald-200 uppercase tracking-wide">{o.customer_name}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          
          /* MODE 2: CLIENT-FACING TV PANEL */
          <div className="flex-1 flex flex-col bg-neutral-950 text-white p-6 md:p-10 select-none overflow-hidden relative">
            
            {/* TV DUAL COLUMNS LAYOUT */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 overflow-hidden h-full">
              
              {/* LEFT HALF: PREPARATION IN PROGRESS */}
              <div className="flex flex-col bg-neutral-900/40 rounded-[32px] border border-neutral-800/80 p-6 md:p-8 h-full overflow-hidden">
                <div className="text-center pb-4 border-b border-neutral-800 flex items-center justify-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-sky-500 animate-pulse" />
                  <h2 className="text-xl md:text-2xl font-black uppercase text-sky-400 tracking-widest">PREPARANDO</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 grid grid-cols-2 gap-4 items-start justify-items-center align-content-start">
                  {preparing.length === 0 ? (
                    <div className="col-span-2 h-full flex items-center justify-center py-20">
                      <span className="text-sm font-bold text-neutral-600 uppercase tracking-widest">Aguardando novos pedidos...</span>
                    </div>
                  ) : (
                    preparing.map(o => (
                      <div 
                        key={o.id} 
                        className="w-full text-center py-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-sm text-3xl md:text-5xl font-black text-neutral-300 font-mono tracking-wide"
                      >
                        #{o.ticket_number}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT HALF: READY / RETIRE AQUI */}
              <div className="flex flex-col bg-emerald-950/10 rounded-[32px] border-2 border-emerald-900/60 p-6 md:p-8 h-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.03)]">
                <div className="text-center pb-4 border-b border-emerald-900/60 flex items-center justify-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
                  <h2 className="text-xl md:text-2xl font-black uppercase text-emerald-400 tracking-widest">PRONTO PARA RETIRAR</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 grid grid-cols-2 gap-4 items-start justify-items-center align-content-start">
                  {ready.length === 0 ? (
                    <div className="col-span-2 h-full flex flex-col items-center justify-center py-20 text-center gap-2">
                      <div className="w-12 h-12 bg-neutral-900 text-neutral-600 rounded-full flex items-center justify-center border border-neutral-800">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-neutral-600 uppercase tracking-widest">Sem pedidos prontos no momento</span>
                    </div>
                  ) : (
                    ready.map(o => (
                      <div 
                        key={o.id} 
                        className="w-full text-center py-5 bg-emerald-900 text-white rounded-2xl shadow-lg border-2 border-emerald-400/30 text-4xl md:text-6xl font-black font-mono tracking-wider animate-pulse flex flex-col justify-center items-center"
                      >
                        <div>#{o.ticket_number}</div>
                        {o.customer_name && (
                          <div className="text-[10px] uppercase font-bold text-emerald-250 mt-1 max-w-[90%] truncate">
                            {o.customer_name}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* BRANDING FOOTER */}
            <div className="text-center pt-6 mt-4 border-t border-neutral-900 text-xs font-bold text-neutral-600 uppercase tracking-widest shrink-0 flex items-center justify-center gap-2">
              <span>PRINT</span>
              <span className="bg-neutral-800 px-1 py-0.5 rounded text-[10px] text-neutral-400">FOOD</span>
              <span>• RETIRE SEU PEDIDO COM O SEU NÚMERO DE FICHA</span>
            </div>

            {/* GIANT CALL OVERLAY POPUP */}
            {showCallAlert && lastCalledTicket && (
              <div className="absolute inset-0 z-50 bg-neutral-950/98 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="w-24 h-24 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <Bell className="w-12 h-12" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-neutral-400 uppercase tracking-widest mb-2">
                  PEDIDO PRONTO!
                </h3>
                
                <p className="text-sm text-neutral-500 mb-4 font-bold uppercase tracking-wider">
                  Favor retirar no balcão de entrega
                </p>

                <div className="text-8xl md:text-[12rem] font-black font-mono text-emerald-400 tracking-wider animate-pulse my-4">
                  #{lastCalledTicket}
                </div>

                {orders.find(o => o.ticket_number === lastCalledTicket)?.customer_name && (
                  <div className="text-xl md:text-3xl font-black text-white uppercase tracking-wide mt-2">
                    {orders.find(o => o.ticket_number === lastCalledTicket)?.customer_name}
                  </div>
                )}
                
                <div className="mt-8 text-xs text-neutral-600 font-bold uppercase tracking-widest">
                  Chamando...
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};
