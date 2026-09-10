import React, { useEffect } from 'react';
import { Printer, X, ArrowRight, Send } from 'lucide-react';
import { Order, Business, PrinterConfig } from '../../types';
import { supabaseService } from '../../services/supabaseService';

interface TicketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  business: Business | null;
}

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  items,
  business
}) => {
  const [printSuccessMsg, setPrintSuccessMsg] = React.useState<string | null>(null);

  const config: PrinterConfig = supabaseService.getPrinterConfig();
  const isMobileSendToPc = config.targetMode === 'mobile_send_to_pc';
  const copies = config.printCopies || 1;
  const is58mm = config.paperWidth === '58mm';
  const isA4 = config.paperWidth === 'a4';

  // Auto-print if enabled and not remote-only
  useEffect(() => {
    if (config.autoPrintOnOrder && !isMobileSendToPc && order) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [order?.id, config.autoPrintOnOrder, isMobileSendToPc]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    if (isMobileSendToPc) {
      // Simula envio para fila do PC
      supabaseService.dispatchRemotePrintJob({
        business_id: business?.id || '',
        order_id: order.id,
        ticket_number: order.ticket_number,
        source_device: 'Mobile (Operador)',
        attendant_name: order.attendant_name || 'Operador',
        customer_name: order.customer_name || undefined,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        total: order.total,
        payment_method: order.payment_method
      });
      setPrintSuccessMsg('Ficha enviada com sucesso para a fila de impressão do Computador!');
    } else {
      setPrintSuccessMsg('Janela de impressão aberta!');
      window.print();
    }
    setTimeout(() => setPrintSuccessMsg(null), 4000);
  };

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const orderTime = new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('pt-BR');

  // Single ticket render
  const renderSingleVoucher = (copyLabel?: string, specificItem?: { name: string; quantity: number; total: number }) => (
    <div 
      key={copyLabel || specificItem?.name}
      className={`bg-white text-neutral-900 rounded-xl p-4 sm:p-5 shadow-lg font-mono text-xs border border-neutral-300 mb-4 ${
        is58mm ? 'w-full max-w-[240px]' : isA4 ? 'w-full max-w-[500px]' : 'w-full max-w-[320px]'
      }`}
    >
      {/* LOGOMARCA & CABEÇALHO */}
      <div className="text-center border-b border-dashed border-neutral-400 pb-2.5 mb-2.5">
        <div className="flex items-center justify-center gap-1 text-xl font-black tracking-tight text-neutral-950 font-['Plus_Jakarta_Sans',sans-serif]">
          <span>Print</span>
          <span className="text-orange-600">Food</span>
        </div>
        
        {config.headerCustomText && (
          <div className="text-[10px] font-bold text-neutral-700 uppercase mt-0.5 tracking-wider">
            {config.headerCustomText}
          </div>
        )}

        <div className="text-[11px] font-bold text-neutral-600 uppercase">
          {business?.name || 'Caixa Central'}
        </div>
        <div className="text-[10px] text-neutral-500">
          {orderDate} às {orderTime}
        </div>
        {order.attendant_name && (
          <div className="text-[10px] font-semibold text-neutral-600">
            Atendente: {order.attendant_name}
          </div>
        )}
        {copyLabel && (
          <div className="mt-1 inline-block px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded text-[9px] font-black uppercase">
            {copyLabel}
          </div>
        )}
      </div>

      {/* DESTAQUE NÚMERO DA FICHA */}
      <div className="text-center py-2 bg-neutral-100 rounded-lg border border-neutral-300 mb-3">
        <div className="text-[10px] font-bold tracking-widest text-neutral-600 uppercase">
          {specificItem ? 'VALE RETIRADA - ITEM' : 'FICHA DE RETIRADA'}
        </div>
        <div className="text-4xl font-black text-neutral-950 tracking-wider">
          #{order.ticket_number}
        </div>
        {order.customer_name && (
          <div className="text-xs font-bold text-neutral-700 mt-1">
            Cliente: {order.customer_name}
          </div>
        )}
      </div>

      {/* CONTEÚDO: SEPARADO POR ITEM OU LISTA COMPLETA */}
      {specificItem ? (
        <div className="border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 text-center">
          <div className="text-base font-black text-neutral-950">
            {specificItem.quantity}x {specificItem.name}
          </div>
          <div className="text-[11px] font-bold text-neutral-600 mt-0.5">
            Valor: {formatMoney(specificItem.total)}
          </div>
        </div>
      ) : (
        <div className="border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 space-y-1.5">
          <div className="text-[10px] font-bold text-neutral-500 uppercase flex justify-between">
            <span>ITEM</span>
            <span>TOTAL</span>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-xs font-semibold">
              <span className="pr-2">
                <span className="font-bold">{item.quantity}x</span> {item.name}
              </span>
              <span className="shrink-0">{formatMoney(item.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* TOTAL & FORMA DE PAGAMENTO */}
      <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between items-center text-xs font-black">
          <span>TOTAL PAGO:</span>
          <span className="text-sm">{formatMoney(order.total)}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-neutral-600 font-semibold uppercase">
          <span>FORMA:</span>
          <span>{order.payment_method.toUpperCase()}</span>
        </div>
      </div>

      {/* MENSAGEM DO RODAPÉ */}
      <div className="text-center pt-1 text-[10px] font-bold text-neutral-600 uppercase">
        {config.footerCustomText || '*** APRESENTE ESTA FICHA NO BALCÃO ***'}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base font-black text-white">Venda Confirmada #{order.ticket_number}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATUS DE DISPARO REMOTO (CELULAR -> PC) */}
        {isMobileSendToPc && (
          <div className="bg-blue-950/60 border-b border-blue-900/60 px-5 py-2.5 flex items-center gap-2.5 text-xs text-blue-300 font-semibold">
            <Send className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-white">Enviado para a Estação PC!</span> Ficha #{order.ticket_number} transmitida para impressão no computador do caixa.
            </div>
          </div>
        )}

        {/* PREVIEW CONTAINER */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center bg-neutral-950/70">
          <div id="printfood-printable-ticket" className="flex flex-col items-center">
            {config.separateVouchersByItem ? (
              // Imprimir cada item como uma ficha separada
              items.map((item, idx) => (
                <React.Fragment key={idx}>
                  {Array.from({ length: copies }).map((_, cIdx) => 
                    renderSingleVoucher(copies > 1 ? `${cIdx + 1}ª VIA` : undefined, item)
                  )}
                </React.Fragment>
              ))
            ) : (
              // Ficha resumida padrão
              Array.from({ length: copies }).map((_, cIdx) => 
                renderSingleVoucher(copies > 1 ? (cIdx === 0 ? '1ª VIA - CLIENTE' : '2ª VIA - PRODUÇÃO') : undefined)
              )
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-2.5">
          {printSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold text-center animate-in fade-in">
              {printSuccessMsg}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-orange-950/50"
            >
              <Printer className="w-5 h-5" />
              <span>{isMobileSendToPc ? 'Re-imprimir no Aparelho' : 'Imprimir Ficha'}</span>
            </button>
            
            <button
              onClick={onClose}
              className="py-3.5 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <span>Próxima Venda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
