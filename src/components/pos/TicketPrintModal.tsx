import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ArrowRight, Send, Smartphone, Check, CheckCircle2, RefreshCw } from 'lucide-react';
import { Order, Business, PrinterConfig } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { connectWebUsbPrinter, printViaWebUsb } from '../../lib/webUsbPrinter';

interface TicketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  items: { name: string; categoryName?: string; quantity: number; unitPrice: number; total: number }[];
  business: Business | null;
  autoPrint?: boolean;
}

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  items,
  business,
  autoPrint
}) => {
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [hasSentRemote, setHasSentRemote] = useState(false);
  const [isSendingRemote, setIsSendingRemote] = useState(false);

  const config: PrinterConfig = supabaseService.getPrinterConfig();
  const activeAttendant = supabaseService.getActiveAttendant();
  // Se for um atendente cadastrado (ou estiver no modo mobile_send_to_pc), envia direto para o PC
  const isMobileSendToPc = config.targetMode === 'mobile_send_to_pc' || (activeAttendant && activeAttendant.role === 'atendente');
  const copies = config.printCopies || 1;
  const is58mm = config.paperWidth === '58mm';

  useEffect(() => {
    if (isOpen) {
      setShowConfirmClose(false);
      setHasSentRemote(false);
      setPrintSuccessMsg(null);
      if (autoPrint) {
        // Auto trigger print without operator intervention
        setTimeout(() => handlePrint(), 500);
      }
    }
  }, [isOpen, order?.id, autoPrint]);

  const handlePrint = async () => {
    if (!order) return;
    if (isMobileSendToPc) {
      setIsSendingRemote(true);
      try {
        await supabaseService.dispatchRemotePrintJob({
          business_id: business?.id || '',
          order_id: order.id,
          ticket_number: order.ticket_number,
          source_device: config.stationName || `Celular (${order.attendant_name || 'Operador'})`,
          attendant_name: order.attendant_name || 'Operador',
          customer_name: order.customer_name || undefined,
          items: items.map(i => ({ name: i.name, categoryName: i.categoryName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
          total: order.total,
          payment_method: order.payment_method
        });
        setHasSentRemote(true);
        setPrintSuccessMsg('✅ Ficha transmitida com sucesso para o Computador do Caixa!');
      } catch (err: any) {
        console.error('Erro ao enviar ficha para o PC:', err);
        setPrintSuccessMsg('Erro ao conectar ao servidor. Tente reenviar.');
      } finally {
        setIsSendingRemote(false);
      }
    } else if (config.printerType === 'escpos_usb' && config.usbPrinterVendorId) {
      try {
        setPrintSuccessMsg('Enviando via USB...');
        const device = await connectWebUsbPrinter(config.usbPrinterVendorId, config.usbPrinterProductId);
        const mockData = new TextEncoder().encode(`Ficha #${order.ticket_number}\nTotal: ${order.total}\n`);
        await printViaWebUsb(device, mockData);
        setPrintSuccessMsg('Ficha impressa via USB!');
      } catch (err: any) {
        console.error('Erro na impressora USB:', err);
        const errMsg = err?.message || '';
        if (errMsg.includes('permissions policy') || errMsg.includes('disallowed')) {
          setPrintSuccessMsg('Erro de Permissão: Abra o sistema por uma Nova Aba fora do AI Studio para usar a impressora USB!');
        } else {
          setPrintSuccessMsg(`Erro USB: ${err?.message || 'Verifique a conexão da impressora.'}`);
        }
      }
    } else {
      setPrintSuccessMsg(config.directPrinting ? 'Enviando para impressora...' : 'Janela de impressão aberta!');
      window.print();
    }
    
    if (autoPrint) {
      setTimeout(() => {
        setPrintSuccessMsg(null);
        onClose();
      }, 1500);
    } else {
      setTimeout(() => setPrintSuccessMsg(null), 4000);
    }
  };

  if (!isOpen || !order) return null;

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const orderTime = new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('pt-BR');

  // Single ticket render
  const renderSingleVoucher = (uniqueKey: string, copyLabel?: string, specificItem?: { name: string; categoryName?: string; quantity: number; total: number }) => {
    // Group items by category if no specific item is provided
    const groupedItems: Record<string, typeof items> = {};
    if (!specificItem) {
      items.forEach(item => {
        const cat = item.categoryName || 'Diversos';
        if (!groupedItems[cat]) groupedItems[cat] = [];
        groupedItems[cat].push(item);
      });
    }

    return (
      <div 
        key={uniqueKey}
        className={`bg-white text-black rounded-xl print-ticket-container p-3 sm:p-4 shadow-lg font-mono text-sm border-2 border-black mb-4 box-border ${
          is58mm ? 'w-full max-w-[240px]' : 'w-full max-w-[300px]'
        }`}
      >
        {/* LOGOMARCA & CABEÇALHO */}
        <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2.5">
          <div className="flex items-center justify-center gap-1 text-xl font-black tracking-tighter text-black font-['Plus_Jakarta_Sans',sans-serif] mb-0.5">
            <span>PRINT</span>
            <span className="bg-black text-white px-1.5 py-0.5 rounded-md text-base">FOOD</span>
          </div>
          
          {config.headerCustomText && (
            <div className="text-[10px] font-black text-black uppercase mt-0.5 tracking-wider">
              {config.headerCustomText}
            </div>
          )}

          <div className="text-[11px] font-black text-black uppercase truncate">
            {business?.name || 'Caixa Central'}
          </div>
          <div className="text-[10px] text-black font-semibold">
            {orderDate} às {orderTime}
          </div>
          {order.attendant_name && (
            <div className="text-[10px] font-black text-black mt-0.5">
              Atendente: {order.attendant_name}
            </div>
          )}
          {copyLabel && (
            <div className="mt-1 inline-block px-2 py-0.5 bg-neutral-200 text-neutral-900 rounded text-[9px] font-black uppercase">
              {copyLabel}
            </div>
          )}
        </div>

        {/* DESTAQUE NÚMERO DA FICHA (MUITO MAIOR) */}
        <div className="text-center py-2 bg-black rounded-xl border-2 border-black mb-2.5">
          <div className="text-[9px] font-black tracking-widest text-white/80 uppercase">
            {specificItem ? 'VALE RETIRADA - ITEM' : 'FICHA DE CLIENTE'}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-wider mt-0.5">
            #{order.ticket_number}
          </div>
        </div>

        {/* CONTEÚDO: SEPARADO POR ITEM OU LISTA COMPLETA */}
        {specificItem ? (
          <div className="border-b-2 border-dashed border-black pb-2.5 mb-2.5 text-center">
            {specificItem.categoryName && (
              <div className="category-header text-xs font-black border-b-2 border-black mb-1.5 bg-neutral-200 py-0.5 px-1">
                {specificItem.categoryName}
              </div>
            )}
            <div className="text-2xl sm:text-3xl font-black text-black leading-tight break-words">
              <span className="text-3xl sm:text-4xl mr-1.5">{specificItem.quantity}x</span>
              {specificItem.name}
            </div>
            <div className="text-lg font-black text-black mt-1.5">
              Valor: {formatMoney(specificItem.total)}
            </div>
          </div>
        ) : (
          <div className="border-b-2 border-dashed border-black pb-2.5 mb-2.5 space-y-3">
            {Object.entries(groupedItems).map(([cat, catItems]) => (
              <div key={cat} className="space-y-1.5">
                <div className="category-header text-xs font-black border-b-2 border-black mb-1 bg-neutral-200 py-0.5 px-1.5 flex justify-between items-center">
                  <span>{cat}</span>
                  <span className="text-[9px] font-normal opacity-70 italic no-print">Seção</span>
                </div>
                {catItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-base font-black item-row py-0.5">
                    <span className="pr-1.5 leading-snug flex-1 break-words">
                      <span className="font-black text-xl mr-1.5">{item.quantity}x</span>
                      {item.name}
                    </span>
                    <span className="shrink-0 text-sm sm:text-base whitespace-nowrap pl-1">{formatMoney(item.total)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* TOTAL & FORMA DE PAGAMENTO */}
        <div className="border-b-2 border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between items-center text-sm sm:text-base font-black text-black">
            <span>TOTAL:</span>
            <span className="text-lg sm:text-xl">{formatMoney(order.total)}</span>
          </div>
        </div>

        {/* MENSAGEM DO RODAPÉ */}
        <div className="text-center pt-1 text-[10px] font-black text-black uppercase tracking-wider">
          {config.footerCustomText || '*** APRESENTE ESTA FICHA NO BALCÃO ***'}
        </div>
      </div>
    );
  };

  const vouchersList = config.separateVouchersByItem ? (
    // Imprimir cada item como uma ficha separada
    items.map((item, idx) => (
      <React.Fragment key={idx}>
        {Array.from({ length: copies }).map((_, cIdx) => 
          renderSingleVoucher(`item-${idx}-copy-${cIdx}`, copies > 1 ? `${cIdx + 1}ª VIA` : undefined, item)
        )}
      </React.Fragment>
    ))
  ) : (
    // Ficha resumida padrão
    Array.from({ length: copies }).map((_, cIdx) => 
      renderSingleVoucher(`resumo-copy-${cIdx}`, copies > 1 ? (cIdx === 0 ? '1ª VIA - CLIENTE' : '2ª VIA - PRODUÇÃO') : undefined)
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
        
        {/* CONFIRM CLOSE OVERLAY */}
        {showConfirmClose && (
          <div className="absolute inset-0 z-50 bg-neutral-950/98 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-orange-600/10 border border-orange-500/30 text-orange-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <Printer className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black text-white mb-2">
              Pedido impresso corretamente?
            </h3>
            
            <p className="text-sm text-neutral-400 mb-6 max-w-xs leading-relaxed">
              Verifique se a ficha saiu da impressora térmica. Se prosseguir sem imprimir, as informações do pedido ativo serão fechadas da tela.
            </p>
            
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  onClose();
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-emerald-950/50"
              >
                Sim, iniciar Nova Venda
              </button>
              
              <button
                onClick={async () => {
                  setShowConfirmClose(false);
                  await handlePrint();
                }}
                className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                Não, Re-imprimir Ficha
              </button>
              
              <button
                onClick={() => setShowConfirmClose(false)}
                className="w-full py-2.5 text-neutral-500 hover:text-neutral-300 font-bold text-xs transition"
              >
                Voltar ao Ticket
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base font-black text-white">Venda Confirmada #{order.ticket_number}</h2>
          </div>
          <button onClick={() => setShowConfirmClose(true)} className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATUS DE DISPARO REMOTO (CELULAR -> PC) */}
        {isMobileSendToPc && (
          <div className={`border-b px-5 py-3 flex items-center gap-3 text-xs font-semibold transition-all ${
            hasSentRemote
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-blue-950/70 border-blue-800 text-blue-300'
          }`}>
            {hasSentRemote ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Smartphone className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
            )}
            <div>
              {hasSentRemote ? (
                <>
                  <span className="font-bold text-white block text-sm">Ficha Enviada para o PC!</span>
                  <span>Ficha #{order.ticket_number} transmitida com sucesso para o computador do caixa.</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-white block text-sm">Modo Celular (Móvel → PC) Ativo</span>
                  <span>Clique no botão abaixo para enviar esta comanda para impressão no PC do caixa.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* PREVIEW CONTAINER */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center bg-neutral-950/70">
          <div className="flex flex-col items-center">
            {vouchersList}
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
            {isMobileSendToPc ? (
              <button
                type="button"
                onClick={handlePrint}
                disabled={isSendingRemote}
                className={`flex-1 py-3.5 px-4 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-lg ${
                  hasSentRemote
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/50'
                } ${isSendingRemote ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isSendingRemote ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Transmitindo para o PC...</span>
                  </>
                ) : hasSentRemote ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Reenviar Ficha para o PC</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>📤 Enviar para Impressão no PC</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-orange-950/50"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir Ficha</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setShowConfirmClose(true)}
              className="py-3.5 px-5 bg-orange-950/50 hover:bg-orange-900 text-orange-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition border border-orange-800/50"
            >
              <span>Nova Venda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {isMobileSendToPc && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
              >
                Ou imprimir diretamente neste celular
              </button>
            </div>
          )}
        </div>

      </div>

      {/* RENDER THE TICKETS OUTSIDE #ROOT IN PORTAL SO IT GETS INCREDIBLE PRINT OUT QUALITY */}
      {createPortal(
        <div id="printfood-printable-ticket" className="flex flex-col items-center">
          {vouchersList}
        </div>,
        document.getElementById('printfood-print-section') || document.body
      )}
    </div>
  );
};
