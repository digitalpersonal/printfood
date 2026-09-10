import React, { useState } from 'react';
import { Banknote, QrCode, CreditCard, Ticket, CheckCircle, X, Loader2, Sparkles } from 'lucide-react';
import { PaymentMethod, Business } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  business: Business | null;
  onConfirm: (method: PaymentMethod, customerName: string) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, cartTotal, business, onConfirm }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [customerName, setCustomerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(selectedMethod, customerName);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsProcessing(false);
        setCustomerName('');
        onClose();
      }, 1500);
    } catch (err) {
      setIsProcessing(false);
      alert('Erro ao processar pagamento. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* HEADER */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Banknote className="w-6 h-6 text-orange-500" />
            Pagamento
          </h2>
          <button onClick={onClose} disabled={isProcessing} className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-inner">
            <span className="text-sm font-bold uppercase tracking-wider text-neutral-400">Total a Pagar</span>
            <span className="text-4xl font-black text-white">{formatMoney(cartTotal)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode, color: 'orange' },
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'emerald' },
                { id: 'debito', label: 'Débito', icon: CreditCard, color: 'sky' },
                { id: 'credito', label: 'Crédito', icon: CreditCard, color: 'violet' },
                { id: 'voucher', label: 'Voucher', icon: Ticket, color: 'yellow' },
                { id: 'outro', label: 'Outros', icon: Sparkles, color: 'neutral' },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id as PaymentMethod)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition ${
                      isSelected
                        ? `border-${m.color}-500 bg-${m.color}-950/30 text-white shadow-lg`
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${isSelected ? `text-${m.color}-400` : ''}`} />
                    <span className="font-extrabold text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMethod === 'pix' && (
             <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
               <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                 <QrCode className="w-14 h-14 text-neutral-900" />
               </div>
               <div>
                 <div className="font-bold text-sm text-white">Chave Pix: {business?.phone || 'Configurar Telefone'}</div>
                 <p className="text-xs text-neutral-400 mt-1">Apresente a chave para o cliente.</p>
               </div>
             </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">Nome na Ficha (Opcional):</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João, Mesa 4"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {success && (
            <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center gap-2 font-bold animate-fade-in">
              <CheckCircle className="w-5 h-5" /> Venda Concluída! Ficha Gerada.
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex gap-3">
          <button onClick={onClose} disabled={isProcessing} className="px-6 py-4 rounded-2xl bg-neutral-800 text-neutral-300 font-bold">
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || success}
            className={`flex-1 py-4 rounded-2xl font-black text-lg uppercase flex items-center justify-center gap-2 transition ${
              isProcessing || success ? 'bg-neutral-800 text-neutral-500' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-950/50'
            }`}
          >
            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Confirmar Pagamento</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
