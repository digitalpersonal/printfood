import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, DollarSign, ShoppingBag, Users, Smartphone, Monitor, Printer } from 'lucide-react';
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
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedItems, setCompletedItems] = useState<{ name: string; quantity: number; unitPrice: number; total: number }[]>([]);
  
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
    
    const items = cart.map(i => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      unit_price: i.product.price,
      total: i.product.price * i.quantity
    }));

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
      // Se estiver configurado para enviar do celular para o PC
      if (printerConfig.targetMode === 'mobile_send_to_pc') {
        await supabaseService.dispatchRemotePrintJob({
          business_id: business.id,
          order_id: order.id,
          ticket_number: order.ticket_number,
          source_device: printerConfig.stationName || 'Celular ' + (activeAttendant?.name || 'Móvel'),
          attendant_name: activeAttendant?.name || 'Operador Móvel',
          customer_name: order.customer_name || undefined,
          items: items.map(item => ({
            name: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total
          })),
          total: order.total,
          payment_method: order.payment_method
        });
      }

      setCompletedOrder(order);
      setCompletedItems(items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total
      })));
      setCart([]);
      onOrderCompleted();
    }
  };

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-60px)] overflow-hidden">
      
      {/* CATEGORIES SIDEBAR (Touch Pills) */}
      <div className="w-full lg:w-56 bg-neutral-900 border-r border-neutral-800 p-3 overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-2 shrink-0 no-scrollbar">
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

      {/* PRODUCTS GRID */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
        <div className="p-3 sm:p-4 border-b border-neutral-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Buscar produto pelo nome..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500 focus:outline-none text-sm font-medium"
            />
          </div>

          {/* ATENDENTE & MODO DA ESTAÇÃO */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Seletor de Atendente */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800 text-xs">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-neutral-400 font-semibold hidden md:inline">Operador:</span>
              <select
                value={activeAttendant?.id || ''}
                onChange={e => {
                  const chosen = allAttendants.find(a => a.id === e.target.value);
                  if (chosen) {
                    supabaseService.setActiveAttendant(chosen);
                    setActiveAttendant(chosen);
                  }
                }}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                <option value="" className="bg-neutral-900">Caixa Central</option>
                {allAttendants.map(a => (
                  <option key={a.id} value={a.id} className="bg-neutral-900">
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Modo de Impressão */}
            <div 
              title={`Modo da Estação: ${
                printerConfig.targetMode === 'mobile_send_to_pc' 
                  ? 'Celular transmitindo fichas para o PC' 
                  : printerConfig.targetMode === 'pc_spooler_server' 
                  ? 'PC Central escutando e imprimindo de celulares' 
                  : 'Impressão local direta'
              }`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${
                printerConfig.targetMode === 'mobile_send_to_pc'
                  ? 'bg-blue-950/40 text-blue-400 border-blue-900/60'
                  : printerConfig.targetMode === 'pc_spooler_server'
                  ? 'bg-orange-950/40 text-orange-400 border-orange-900/60'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800'
              }`}
            >
              {printerConfig.targetMode === 'mobile_send_to_pc' && <Smartphone className="w-3.5 h-3.5" />}
              {printerConfig.targetMode === 'pc_spooler_server' && <Monitor className="w-3.5 h-3.5" />}
              {printerConfig.targetMode === 'local' && <Printer className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {printerConfig.targetMode === 'mobile_send_to_pc' ? 'Móvel → PC' : printerConfig.targetMode === 'pc_spooler_server' ? 'PC Spooler' : 'Local'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(p => {
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleAdd(p)}
                  className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[120px] transition active:scale-95 cursor-pointer ${
                    inCart ? 'bg-orange-950/20 border-orange-500 shadow-md' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
                      {inCart.quantity}x
                    </span>
                  )}
                  <h3 className="font-extrabold text-white text-sm line-clamp-2">{p.name}</h3>
                  <div className="mt-2 text-lg font-black text-orange-500">{formatMoney(p.price)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CART SUMMARY */}
      <div className="w-full lg:w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 h-64 lg:h-auto">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="font-extrabold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" /> Pedido Atual
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-red-400 text-xs font-bold hover:text-red-300">
              Limpar
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-sm font-bold">
              Nenhum item adicionado
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-sm text-white truncate">{item.product.name}</div>
                  <div className="text-orange-400 font-bold text-xs mt-0.5">{formatMoney(item.product.price * item.quantity)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleUpdateQty(item.product.id, -1)} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white active:scale-90">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-black text-white">{item.quantity}</span>
                  <button onClick={() => handleUpdateQty(item.product.id, 1)} className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white active:scale-90">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-neutral-950 border-t border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
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
