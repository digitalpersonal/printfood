import React from 'react';
import { Printer, Smartphone, X } from 'lucide-react';
import { PrintJob } from '../../types';

interface RemoteJobAlertProps {
  job: PrintJob | null;
  onClose: () => void;
  onPrint: (job: PrintJob) => void;
}

export const RemoteJobAlert: React.FC<RemoteJobAlertProps> = ({ job, onClose, onPrint }) => {
  if (!job) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-neutral-900 border-2 border-orange-500 rounded-2xl shadow-2xl p-4 text-white animate-bounce-short">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-orange-400">FICHA RECEBIDA DO CELULAR</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-lg font-black tracking-wide">
              Ficha #{job.ticket_number}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 text-xs text-neutral-300 space-y-1 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80">
        <div className="flex justify-between">
          <span className="text-neutral-400">Origem:</span>
          <span className="font-semibold text-white">{job.source_device}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Operador:</span>
          <span className="font-semibold text-white">{job.attendant_name || 'Móvel'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Total Venda:</span>
          <span className="font-black text-orange-400">
            R$ {job.total.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="pt-1 border-t border-neutral-800 text-[11px] text-neutral-400 truncate">
          {job.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onPrint(job)}
          className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition shadow-md shadow-orange-950/60"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Ficha Agora</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition"
        >
          Dispensar
        </button>
      </div>
    </div>
  );
};
