import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, DollarSign, ShoppingBag, Users, Smartphone, Monitor, Printer, X } from 'lucide-react';
import { Product, Category, Business, PaymentMethod, Order, Attendant, PrinterConfig } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { PaymentModal } from './PaymentModal';
import { TicketPrintModal } from './TicketPrintModal';
import { playBeep } from '../../lib/sound';

interface POSViewProps {
  business: Business | null;
  categories: Category[];
  products: Product[];
  onOrderCompleted: () => void;
}

export const POSView: React.FC<POSViewProps> = ({ business, categories, products, onOrderCompleted }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(() => {
    const saved = localStorage.getItem('printfood_local_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('printfood_local_cart', JSON.stringify(cart));
  }, [cart]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (cartBounce) {
      const timer = setTimeout(() => {
        setCartBounce(false);
        setLastAddedId(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [cartBounce]);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedItems, setCompletedItems] = useState<{ name: string; quantity: number; unitPrice: number; total: number }[]>([]);
  
  interface RecentOrder {
    order: Order;
    items: { name: string; quantity: number; unitPrice: number; total: number }[];
  }

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(() => {
    const saved = business ? localStorage.getItem(`printfood_recent_orders_${business.id}`) : null;
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (business) {
      localStorage.setItem(`printfood_recent_orders_${business.id}`, JSON.stringify(recentOrders));
    }
  }, [recentOrders, business]);
  
  // Attendant and Printer config
  const [activeAttendant, setActiveAttendant] = useState<Attendant | null>(supabaseService.getActiveAttendant());
  const [allAttendants, setAllAttendants] = useState<Attendant[]>([]);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(supabaseService.getPrinterConfig());

  useEffect(() => {
    if (business) {
      supabaseService.getAttendants(business.id).then(setAllAttendants);
    }
    const handleAttendant = () => setActiveAttendant(supabaseService.getActiveAttendant());
    const handlePrinter = () => setPrinterConfig(supabaseService.getPrinterConfig());

    window.addEventListener('printfood:attendant-changed', handleAttendant);
    window.addEventListener('printfood:printer-config-changed', handlePrinter);

    return () => {
      window.removeEventListener('printfood:attendant-changed', handleAttendant);
      window.removeEventListener('printfood:printer-config-changed', handlePrinter);
    };
  }, [business]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.active === false) return false;
      const matchesCat = selectedCatId === 'all' || p.category_id === selectedCatId;
      const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCatId, searchQuery]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);

  const handleAdd = (product: Product) => {
    playBeep();
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setLastAddedId(product.id);
    setCartBounce(true);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        return { ...i, quantity: Math.max(0, i.quantity + delta) };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const handleConfirmPayment = async (method: PaymentMethod, customerName: string) => {
    if (!business) return;
    
    const items = cart.map(i => {
      const category = categories.find((c: Category) => c.id === i.product.category_id);
      return {
        product_id: i.product.id,
        product_name: i.product.name,
        category_name: category?.name || 'Diversos',
        quantity: i.quantity,
        unit_price: i.product.price,
        total: i.product.price * i.quantity
      };
    });

    const orderData = {
      business_id: business.id,
      total: cartTotal,
      payment_method: method,
      payment_status: 'approved',
      order_status: 'pago',
      customer_name: customerName || null,
      attendant_name: activeAttendant?.name || null
    };

    const order = await supabaseService.createOrder(orderData, items);
    if (order) {
      setCompletedOrder(order);
      const newItems = items.map(item => ({
        name: item.product_name,
        categoryName: item.category_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total
      }));
      setCompletedItems(newItems);
      setRecentOrders(prev => [{ order, items: newItems }, ...prev].slice(0, 3));
      setCart([]);
      onOrderCompleted();
    }
  };

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  // Color map for categories
  const categoryColors = useMemo(() => {
    const pallete = [
      { bg: 'bg-blue-950/45 hover:bg-blue-950/60', border: 'border-blue-700/50', text: 'text-blue-400' },
      { bg: 'bg-emerald-950/45 hover:bg-emerald-950/60', border: 'border-emerald-700/50', text: 'text-emerald-400' },
      { bg: 'bg-purple-950/45 hover:bg-purple-950/60', border: 'border-purple-700/50', text: 'text-purple-400' },
      { bg: 'bg-rose-950/45 hover:bg-rose-950/60', border: 'border-rose-700/50', text: 'text-rose-400' },
      { bg: 'bg-amber-950/45 hover:bg-amber-950/60', border: 'border-amber-700/50', text: 'text-amber-400' },
      { bg: 'bg-teal-950/45 hover:bg-teal-950/60', border: 'border-teal-700/50', text: 'text-teal-400' },
      { bg: 'bg-indigo-950/45 hover:bg-indigo-950/60', border: 'border-indigo-700/50', text: 'text-indigo-400' },
      { bg: 'bg-fuchsia-950/45 hover:bg-fuchsia-950/60', border: 'border-fuchsia-700/50', text: 'text-fuchsia-400' },
    ];
    const map: Record<string, typeof pallete[0]> = {};
    categories.forEach((cat, index) => {
      map[cat.id] = pallete[index % pallete.length];
    });
    return map;
  }, [categories]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-neutral-950">
      
      {/* CATEGORIES SIDEBAR (Touch Pills) */}
      <div className="w-full lg:w-56 bg-neutral-900 border-r border-neutral-800 p-3 overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-2 shrink-0 no-scrollbar lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-4 py-3 rounded-2xl font-extrabold text-sm text-left transition whitespace-nowrap shrink-0 ${
            selectedCatId === 'all' ? 'bg-orange-600 text-white shadow-md' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
          }`}
        >
          TODOS
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-4 py-3 rounded-2xl font-extrabold text-sm text-left transition whitespace-nowrap shrink-0 ${
              selectedCatId === cat.id ? 'bg-orange-600 text-white shadow-md' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            {cat.name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* PRODUCTS AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
        <div className="p-3 sm:p-4 border-b border-neutral-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Buscar produto pelo nome..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-10 py-3 text-white focus:border-orange-500 focus:outline-none text-sm font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 p-1 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-white transition"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ATENDENTE & MODO DA ESTAÇÃO */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {/* Seletor de Atendente */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs">
              <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="text-neutral-400 font-semibold text-[11px]">Operador:</span>
              <select
                value={activeAttendant?.id || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    supabaseService.setActiveAttendant(null);
                    setActiveAttendant(null);
                  } else {
                    const chosen = allAttendants.find(a => a.id === val);
                    if (chosen) {
                      supabaseService.setActiveAttendant(chosen);
                      setActiveAttendant(chosen);
                    }
                  }
                }}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs flex-1 truncate"
              >
                <option value="" className="bg-neutral-900">🖥️ Caixa Central (PC)</option>
                {allAttendants.map(a => (
                  <option key={a.id} value={a.id} className="bg-neutral-900">
                    📱 {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Modo de Impressão Rápido (Abaixo do Nome do Operador) */}
            <div 
              title="Perfil deste aparelho: altere com um toque entre Celular (Móvel -> PC) e PC Caixa (Local)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                printerConfig.targetMode === 'mobile_send_to_pc'
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                  : printerConfig.targetMode === 'pc_spooler_server'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {printerConfig.targetMode === 'mobile_send_to_pc' && <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              {printerConfig.targetMode === 'pc_spooler_server' && <Monitor className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
              {printerConfig.targetMode === 'local' && <Printer className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
              
              <span className="text-neutral-400 font-semibold text-[11px]">Perfil:</span>
              <select
                value={printerConfig.targetMode || 'local'}
                onChange={async (e) => {
                  const newMode = e.target.value as any;
                  const updated = { ...printerConfig, targetMode: newMode };
                  await supabaseService.savePrinterConfig(updated);
                  setPrinterConfig(updated);
                }}
                className={`bg-transparent font-bold outline-none cursor-pointer text-xs flex-1 truncate ${
                  printerConfig.targetMode === 'mobile_send_to_pc'
                    ? 'text-blue-300'
                    : printerConfig.targetMode === 'pc_spooler_server'
                    ? 'text-purple-300'
                    : 'text-neutral-200'
                }`}
              >
                <option value="local" className="bg-neutral-950 text-white">PC Caixa (Local)</option>
                <option value="mobile_send_to_pc" className="bg-neutral-950 text-white">📱 Celular (Móvel → PC)</option>
                <option value="pc_spooler_server" className="bg-neutral-950 text-white">🖥️ Servidor Spooler</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(p => {
              const inCart = cart.find(i => i.product.id === p.id);
              const catColor = p.category_id && categoryColors[p.category_id]
                ? categoryColors[p.category_id]
                : { bg: 'bg-neutral-900 hover:bg-neutral-850', border: 'border-neutral-800', text: 'text-orange-500' };
              const isJustAdded = p.id === lastAddedId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleAdd(p)}
                  className={`relative p-3 rounded-xl border text-left flex flex-col justify-center transition-all duration-205 active:scale-95 cursor-pointer min-h-[72px] ${
                    catColor.bg
                  } ${
                    inCart 
                      ? 'border-orange-500 shadow-md ring-2 ring-orange-500/50 bg-orange-950/20' 
                      : catColor.border
                  } ${isJustAdded ? 'scale-105 border-emerald-500 ring-4 ring-emerald-500/30' : ''}`}
                >
                  {inCart && (
                    <span className={`absolute top-2 right-2 bg-orange-600 text-white text-xs font-black px-2 py-0.5 rounded-full z-10 transition-transform duration-200 ${
                      isJustAdded ? 'scale-135 bg-emerald-500 rotate-6' : 'scale-100'
                    }`}>
                      {inCart.quantity}x
                    </span>
                  )}
                  <h3 className="font-extrabold text-white text-sm line-clamp-2 pr-6 leading-tight">{p.name}</h3>
                  <div className={`mt-1 text-base font-black leading-none ${catColor.text}`}>{formatMoney(p.price)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CART SUMMARY */}
      <div className={`w-full lg:w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 h-1/3 lg:h-[calc(100vh-2rem)] lg:sticky lg:top-4 transition-all duration-300 ${
        cartBounce ? 'ring-2 ring-orange-500 scale-[1.01] shadow-xl shadow-orange-950/30' : ''
      }`}>
        <div className={`p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between transition-all duration-300 ${
          cartBounce ? 'bg-orange-950/20' : ''
        }`}>
          <h2 className="font-extrabold text-white flex items-center gap-2">
            <ShoppingBag className={`w-5 h-5 text-orange-500 transition-transform duration-300 ${cartBounce ? 'scale-135 rotate-12' : ''}`} /> Pedido Atual
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-red-400 text-xs font-bold hover:text-red-300">
              Limpar
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-sm font-bold">
              Nenhum item adicionado
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-xs text-white truncate">{item.product.name}</div>
                  <div className="text-orange-400 font-bold text-[10px] mt-0.5">{formatMoney(item.product.price * item.quantity)}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleUpdateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-white active:scale-90">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-black text-white text-xs">{item.quantity}</span>
                  <button onClick={() => handleUpdateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white active:scale-90">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-3">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-neutral-400 font-bold text-xs uppercase">Total</span>
            <span className="text-3xl font-black text-white">{formatMoney(cartTotal)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className={`w-full py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition active:scale-98 ${
              cart.length > 0 ? 'bg-orange-600 text-white shadow-lg hover:bg-orange-500' : 'bg-neutral-800 text-neutral-500'
            }`}
          >
            <DollarSign className="w-6 h-6" /> PAGAR
          </button>

          {/* ÚLTIMOS PEDIDOS (REIMPRESSÃO RÁPIDA) */}
          {recentOrders.length > 0 && (
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Últimos Tickets (Reimpressão)</span>
                <span className="text-[10px] text-neutral-500">Últimos 3</span>
              </div>
              <div className="space-y-1.5">
                {recentOrders.map((ro, idx) => (
                  <div key={ro.order.id || idx} className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-orange-400">#{ro.order.ticket_number}</span>
                        <span className="text-white font-bold truncate">
                          {ro.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {formatMoney(ro.order.total)} • {new Date(ro.order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playBeep();
                        setCompletedOrder(ro.order);
                        setCompletedItems(ro.items);
                      }}
                      className="p-2 bg-neutral-800 hover:bg-orange-600 text-neutral-200 hover:text-white rounded-xl transition shrink-0 flex items-center gap-1 text-[11px] font-bold"
                      title="Reimprimir ficha"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Reimprimir</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        cartTotal={cartTotal} 
        business={business} 
        onConfirm={handleConfirmPayment}
      />

      <TicketPrintModal
        isOpen={!!completedOrder}
        onClose={() => setCompletedOrder(null)}
        order={completedOrder}
        items={completedItems}
        business={business}
      />
    </div>
  );
};
