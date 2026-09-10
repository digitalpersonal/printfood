import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Users, 
  Store, 
  Smartphone, 
  Monitor, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Send, 
  Sliders, 
  Copy, 
  CheckCircle2, 
  Play,
  FileText,
  ShieldCheck,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  CheckCheck,
  Mail,
  Briefcase,
  User
} from 'lucide-react';
import { Business, Attendant, PrinterConfig, PrintJob, AdminUser } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { SQL_SCHEMA_SCRIPT, MASTER_ADMIN_CREDENTIALS } from '../../data/initialData';
import { playBeep } from '../../lib/sound';
import { TicketPrintModal } from '../pos/TicketPrintModal';

interface SettingsViewProps {
  business: Business | null;
  onBusinessUpdate?: (business: Business) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ business, onBusinessUpdate }) => {
  const [activeTab, setActiveTab] = useState<'printer' | 'attendants' | 'admin' | 'business'>('printer');
  
  // Admin state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(supabaseService.getCurrentAdmin());
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedKiosk, setCopiedKiosk] = useState(false);
  const kioskCommand = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing`;
  const handleCopyKiosk = () => {
    navigator.clipboard.writeText(kioskCommand);
    setCopiedKiosk(true);
    setTimeout(() => setCopiedKiosk(false), 3000);
  };

  // Printer config state
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(supabaseService.getPrinterConfig());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testOrderModalOpen, setTestOrderModalOpen] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  
  // Spooler print jobs state
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  
  // Attendants state
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [activeAttendant, setActiveAttendant] = useState<Attendant | null>(supabaseService.getActiveAttendant());
  const [isAttendantModalOpen, setIsAttendantModalOpen] = useState(false);
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null);
  const [showAttendantPassword, setShowAttendantPassword] = useState(false);
  const [attendantForm, setAttendantForm] = useState<{
    name: string;
    email: string;
    password: string;
    code: string;
    role: 'caixa' | 'atendente';
    active: boolean;
  }>({
    name: '',
    email: '',
    password: '',
    code: '',
    role: 'atendente',
    active: true
  });

  // Business editing
  const [businessName, setBusinessName] = useState(business?.name || '');
  const [businessDoc, setBusinessDoc] = useState(business?.document || '');
  const [businessPhone, setBusinessPhone] = useState(business?.phone || '');
  const [copiedSql, setCopiedSql] = useState(false);

  // Load data
  const loadAttendants = async () => {
    if (!business) return;
    const data = await supabaseService.getAttendants(business.id);
    setAttendants(data);
  };

  const loadPrintJobs = async () => {
    if (!business) return;
    setLoadingJobs(true);
    const jobs = await supabaseService.getPrintJobs(business.id);
    setPrintJobs(jobs);
    setLoadingJobs(false);
  };

  useEffect(() => {
    loadAttendants();
    loadPrintJobs();

    const handleJobEvent = () => loadPrintJobs();
    const handleAttendantEvent = () => {
      loadAttendants();
      setActiveAttendant(supabaseService.getActiveAttendant());
    };
    const handleAdminAuthEvent = () => {
      setAdminUser(supabaseService.getCurrentAdmin());
    };

    window.addEventListener('printfood:remote-print-job', handleJobEvent);
    window.addEventListener('printfood:print-job-updated', handleJobEvent);
    window.addEventListener('printfood:attendant-changed', handleAttendantEvent);
    window.addEventListener('printfood:admin-auth-changed', handleAdminAuthEvent);

    return () => {
      window.removeEventListener('printfood:remote-print-job', handleJobEvent);
      window.removeEventListener('printfood:print-job-updated', handleJobEvent);
      window.removeEventListener('printfood:attendant-changed', handleAttendantEvent);
      window.removeEventListener('printfood:admin-auth-changed', handleAdminAuthEvent);
    };
  }, [business]);

  // Save printer config
  const handleSavePrinterConfig = () => {
    supabaseService.savePrinterConfig(printerConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Test Print locally
  const handleTestPrint = () => {
    playBeep();
    setTestOrderModalOpen(true);
  };

  // Simulate remote print from mobile to PC
  const handleSimulateMobilePrint = async () => {
    if (!business) return;
    playBeep();
    const mockNumber = String(Math.floor(100 + Math.random() * 900));
    await supabaseService.dispatchRemotePrintJob({
      business_id: business.id,
      order_id: 'test-order-' + Date.now(),
      ticket_number: mockNumber,
      source_device: 'Celular Garçom ' + (activeAttendant?.name || 'Móvel'),
      attendant_name: activeAttendant?.name || 'Operador Móvel',
      customer_name: 'Cliente Teste Móvel',
      items: [
        { name: 'Chopp Artesanal 400ml', quantity: 2, unitPrice: 14.00, total: 28.00 },
        { name: 'Pastel Especial de Carne', quantity: 1, unitPrice: 12.00, total: 12.00 }
      ],
      total: 40.00,
      payment_method: 'pix'
    });
    setTestSuccessMessage(`Ficha de teste #${mockNumber} disparada com sucesso para a fila do PC!`);
    setTimeout(() => setTestSuccessMessage(null), 5000);
    loadPrintJobs();
  };

  // Reprint a job
  const handleReprintJob = (job: PrintJob) => {
    playBeep();
    supabaseService.updatePrintJobStatus(job.id, 'printed');
    window.print();
  };

  // Attendant actions
  const openNewAttendantModal = () => {
    setEditingAttendant(null);
    setShowAttendantPassword(false);
    setAttendantForm({
      name: '',
      email: '',
      password: '',
      code: String(Math.floor(10 + Math.random() * 90)),
      role: 'atendente',
      active: true
    });
    setIsAttendantModalOpen(true);
  };

  const openEditAttendantModal = (att: Attendant) => {
    setEditingAttendant(att);
    setShowAttendantPassword(false);
    setAttendantForm({
      name: att.name,
      email: att.email || '',
      password: att.password || '',
      code: att.code || '01',
      role: att.role === 'caixa' ? 'caixa' : 'atendente',
      active: att.active
    });
    setIsAttendantModalOpen(true);
  };

  const handleSaveAttendant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !attendantForm.name.trim() || !attendantForm.email.trim()) return;

    await supabaseService.saveAttendant({
      id: editingAttendant?.id,
      business_id: business.id,
      name: attendantForm.name.trim(),
      email: attendantForm.email.trim().toLowerCase(),
      password: attendantForm.password.trim(),
      code: attendantForm.code.trim() || '01',
      role: attendantForm.role,
      active: attendantForm.active
    });

    setIsAttendantModalOpen(false);
    loadAttendants();
  };

  const handleDeleteAttendant = async (id: string) => {
    await supabaseService.deleteAttendant(id);
    if (activeAttendant?.id === id) {
      supabaseService.setActiveAttendant(null);
      setActiveAttendant(null);
    }
    loadAttendants();
  };

  const handleSelectActiveAttendant = (att: Attendant) => {
    supabaseService.setActiveAttendant(att);
    setActiveAttendant(att);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-neutral-950">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOP BAR / TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Sliders className="w-6 h-6 text-orange-500" />
              <span>Configurações do PrintFood</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gestão de impressoras térmicas, servidor de impressão (Celular → PC) e atendentes.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 self-start">
            <button
              onClick={() => setActiveTab('printer')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'printer'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Impressora & Spooler</span>
            </button>

            <button
              onClick={() => setActiveTab('attendants')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'attendants'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Atendentes & Caixas</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'admin'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Administrador Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'business'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Dados da Loja</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: IMPRESSORA & SPOOLER (CELULAR -> PC) */}
        {/* ==================================================== */}
        {activeTab === 'printer' && (
          <div className="space-y-6">
            
            {/* 1. SELEÇÃO DE MODO OPERACIONAL */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="mb-4">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Arquitetura de Operação
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  Como este aparelho está operando agora?
                </h2>
                <p className="text-xs text-neutral-400">
                  Defina se este aparelho é o computador com a impressora plugada ou um celular móvel de atendimento.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                
                {/* MODO PC SPOOLER */}
                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, targetMode: 'pc_spooler_server' })}
                  className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    printerConfig.targetMode === 'pc_spooler_server'
                      ? 'bg-orange-950/40 border-orange-500 ring-1 ring-orange-500 shadow-md'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold">
                        <Monitor className="w-5 h-5" />
                      </div>
                      {printerConfig.targetMode === 'pc_spooler_server' && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase">
                          Ativo Aqui
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-white mb-1">
                      Estação Central (PC + Impressora)
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Atua como <strong>Servidor de Impressão</strong>. Fica escutando e imprimindo automaticamente todas as fichas enviadas pelos celulares.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Recebe de múltiplos celulares
                  </div>
                </button>

                {/* MODO CELULAR MÓVEL */}
                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, targetMode: 'mobile_send_to_pc' })}
                  className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    printerConfig.targetMode === 'mobile_send_to_pc'
                      ? 'bg-orange-950/40 border-orange-500 ring-1 ring-orange-500 shadow-md'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      {printerConfig.targetMode === 'mobile_send_to_pc' && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase">
                          Ativo Aqui
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-white mb-1">
                      Terminal Móvel (Celular / Tablet)
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Usado pelos garçons ou atendentes na fila. Ao confirmar a venda, <strong>envia a ficha via nuvem direto para o PC do caixa</strong> imprimir.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center gap-1.5 text-[11px] text-blue-400 font-semibold">
                    <Send className="w-3 h-3" />
                    Disparo remoto em tempo real
                  </div>
                </button>

                {/* MODO IMPRESSÃO LOCAL */}
                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, targetMode: 'local' })}
                  className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    printerConfig.targetMode === 'local'
                      ? 'bg-orange-950/40 border-orange-500 ring-1 ring-orange-500 shadow-md'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold">
                        <Printer className="w-5 h-5" />
                      </div>
                      {printerConfig.targetMode === 'local' && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase">
                          Ativo Aqui
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-white mb-1">
                      Impressão Local / Direta
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Imprime no próprio aparelho através do diálogo de impressão do navegador ou impressora conectada localmente.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center gap-1.5 text-[11px] text-neutral-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Operação autônoma
                  </div>
                </button>

              </div>
            </div>

            {/* 2. DETALHES DE FORMATAÇÃO E HARDWARE DA IMPRESSORA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* CONFIGURAÇÕES GERAIS DA BOBINA */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-orange-500" />
                  <span>Configuração da Impressora & Bobina</span>
                </h3>

                <div className="space-y-3.5">
                  {/* Nome da Estação */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Nome identificador deste dispositivo:
                    </label>
                    <input
                      type="text"
                      value={printerConfig.stationName}
                      onChange={e => setPrinterConfig({ ...printerConfig, stationName: e.target.value })}
                      placeholder="Ex: Caixa 01 PC, Celular Maria, Terminal Quermesse"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                    />
                  </div>

                  {/* Largura da Bobina */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Largura do Papel:
                      </label>
                      <select
                        value={printerConfig.paperWidth}
                        onChange={e => setPrinterConfig({ ...printerConfig, paperWidth: e.target.value as any })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-medium"
                      >
                        <option value="80mm">80mm (Padrão Térmica)</option>
                        <option value="58mm">58mm (Bobina Estreita)</option>
                        <option value="a4">A4 (Impressora Comum / Escritório)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Número de Vias:
                      </label>
                      <select
                        value={printerConfig.printCopies}
                        onChange={e => setPrinterConfig({ ...printerConfig, printCopies: Number(e.target.value) })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-medium"
                      >
                        <option value={1}>1 Via (Ficha Cliente)</option>
                        <option value={2}>2 Vias (Cliente + Cozinha)</option>
                      </select>
                    </div>
                  </div>

                  {/* Tipo de Impressora */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Método de Impressão:
                    </label>
                    <select
                      value={printerConfig.printerType}
                      onChange={e => setPrinterConfig({ ...printerConfig, printerType: e.target.value as any })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-medium"
                    >
                      <option value="browser">Impressora Padrão do Sistema / Navegador (Recomendado)</option>
                      <option value="network">Impressora de Rede / Ethernet (Raw TCP / 9100)</option>
                      <option value="bluetooth">Bluetooth ESC/POS (Portátil)</option>
                    </select>
                  </div>

                  {/* Rede IP se selecionado */}
                  {printerConfig.printerType === 'network' && (
                    <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-neutral-400 block mb-1">IP da Impressora:</label>
                        <input
                          type="text"
                          value={printerConfig.networkPrinterIp || ''}
                          onChange={e => setPrinterConfig({ ...printerConfig, networkPrinterIp: e.target.value })}
                          placeholder="192.168.1.200"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-400 block mb-1">Porta:</label>
                        <input
                          type="number"
                          value={printerConfig.networkPrinterPort || 9100}
                          onChange={e => setPrinterConfig({ ...printerConfig, networkPrinterPort: Number(e.target.value) })}
                          placeholder="9100"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Vias separadas por item */}
                  <div className="pt-2 border-t border-neutral-800/80 space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={printerConfig.separateVouchersByItem}
                        onChange={e => setPrinterConfig({ ...printerConfig, separateVouchersByItem: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white block">Imprimir Fichas Individuais por Item</span>
                        <span className="text-neutral-400">
                          Gera 1 ficha para cada lanche ou bebida (ideal para eventos com barracas separadas).
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={printerConfig.autoPrintOnOrder}
                        onChange={e => setPrinterConfig({ ...printerConfig, autoPrintOnOrder: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white block">Impressão Automática ao Concluir Venda</span>
                        <span className="text-neutral-400">
                          Abre o diálogo de impressão imediatamente assim que o pagamento for registrado.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Header e Footer Customizados */}
                  <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                        Cabeçalho Personalizado da Ficha:
                      </label>
                      <input
                        type="text"
                        value={printerConfig.headerCustomText || ''}
                        onChange={e => setPrinterConfig({ ...printerConfig, headerCustomText: e.target.value })}
                        placeholder="Ex: FESTA DA COMUNIDADE - CAIXA CENTRAL"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                        Rodapé / Mensagem do Balcão:
                      </label>
                      <input
                        type="text"
                        value={printerConfig.footerCustomText || ''}
                        onChange={e => setPrinterConfig({ ...printerConfig, footerCustomText: e.target.value })}
                        placeholder="Ex: GUARDE ESTA FICHA E RETIRE NO BALCÃO"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                </div>

                {/* BOTÕES DE SALVAR E TESTAR */}
                <div className="pt-3 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleSavePrinterConfig}
                    className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition shadow-md"
                  >
                    {saveSuccess ? <Check className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                    <span>{saveSuccess ? 'Configuração Salva!' : 'Salvar Configurações'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPrint}
                    className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Play className="w-3.5 h-3.5 text-orange-400" />
                    <span>Testar Impressão</span>
                  </button>
                </div>

              </div>

              {/* KIOSK PRINTING --kiosk-printing GUIDE */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Impressão Direta sem Diálogo (Modo Kiosk)</span>
                    <h3 className="text-base font-black text-white mt-0.5">Como imprimir direto na impressora térmica sem abrir a janela de diálogo</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Para que o navegador imprima instantaneamente (sem precisar clicar em "Imprimir" toda vez, resolvendo o problema de janelas que abrem mas não imprimem), crie um atalho do Google Chrome no seu PC com o argumento <code className="text-orange-400 font-mono">--kiosk-printing</code>, exatamente como no Guarafood.
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <code className="text-xs font-mono text-emerald-400 break-all select-all flex-1">
                    {kioskCommand}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyKiosk}
                    className="py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5"
                  >
                    {copiedKiosk ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKiosk ? 'Copiado!' : 'Copiar Atalho'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-neutral-400 space-y-1">
                  <p><strong>Como usar no Windows:</strong></p>
                  <ol className="list-decimal list-inside space-y-0.5 text-neutral-400">
                    <li>Clique no botão acima para copiar o comando com <code className="text-neutral-200">--kiosk-printing</code>.</li>
                    <li>Na Área de Trabalho do Windows, clique com o botão direito &gt; <strong>Novo &gt; Atalho</strong>.</li>
                    <li>Cole o texto copiado, clique em Avançar, dê um nome (ex: <em>PrintFood Kiosk</em>) e Concluir.</li>
                    <li>Abra o PrintFood sempre por esse atalho. As impressões sairão direto na sua impressora térmica padrão sem abrir caixas de diálogo!</li>
                  </ol>
                </div>
              </div>

              {/* PAINEL DO SERVIDOR DE IMPRESSÃO (SPOOLER DE FICHAS REMOTAS) */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-orange-500" />
                      <span>Fila de Impressão Remota (Spooler)</span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Fichas enviadas dos celulares para este PC imprimir.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Pronto
                    </span>
                    <button
                      onClick={loadPrintJobs}
                      title="Atualizar fila"
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* TESTE DE DISPARO REMOTO */}
                <div className="my-3.5 space-y-2">
                  <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-white">Testar Envio Celular → PC</div>
                      <div className="text-neutral-400 text-[11px]">Dispara uma ficha simulada de celular para a fila do PC.</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateMobilePrint}
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Disparar Ficha Teste</span>
                    </button>
                  </div>

                  {testSuccessMessage && (
                    <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{testSuccessMessage}</span>
                    </div>
                  )}
                </div>

                {/* LISTA DE JOBS / FICHAS */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
                  {printJobs.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-neutral-800 rounded-2xl">
                      <Smartphone className="w-8 h-8 text-neutral-600 mb-2" />
                      <span className="text-xs font-bold text-neutral-400">Nenhuma ficha na fila no momento</span>
                      <span className="text-[11px] text-neutral-500 max-w-xs mt-0.5">
                        Quando um garçom ou atendente confirmar venda pelo celular, ela aparecerá aqui automaticamente.
                      </span>
                    </div>
                  ) : (
                    printJobs.map(job => (
                      <div
                        key={job.id}
                        className="p-3 bg-neutral-950 border border-neutral-800/90 rounded-2xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-orange-400">
                              #{job.ticket_number}
                            </span>
                            <span className="text-white font-bold">{job.source_device}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              job.status === 'printed' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {job.status === 'printed' ? 'Impresso' : 'Aguardando'}
                            </span>
                          </div>

                          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <span>{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
                            <span>•</span>
                            <span>{job.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-white">
                            R$ {job.total.toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleReprintJob(job)}
                            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl transition"
                            title="Reimprimir ficha"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {printJobs.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-neutral-800 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        if (business) {
                          await supabaseService.clearPrintJobs(business.id);
                          loadPrintJobs();
                        }
                      }}
                      className="text-[11px] text-neutral-500 hover:text-red-400 font-semibold transition"
                    >
                      Limpar histórico de impressões
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: ATENDENTES & CAIXAS */}
        {/* ==================================================== */}
        {activeTab === 'attendants' && (
          <div className="space-y-6">
            
            {/* ATENDENTE ATUAL DESTE APARELHO */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Operador Ativo Neste Aparelho
                </span>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-neutral-950 font-black text-lg flex items-center justify-center shadow-md">
                    {activeAttendant?.name.substring(0, 2).toUpperCase() || 'CX'}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {activeAttendant?.name || 'Nenhum Atendente Selecionado'}
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Código #{activeAttendant?.code || '01'} • Função:{' '}
                      <span className="font-semibold text-neutral-300 uppercase">
                        {activeAttendant?.role || 'Caixa'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 hidden sm:inline">Trocar operador:</span>
                <select
                  value={activeAttendant?.id || ''}
                  onChange={e => {
                    const chosen = attendants.find(a => a.id === e.target.value);
                    if (chosen) handleSelectActiveAttendant(chosen);
                  }}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-orange-500 outline-none"
                >
                  <option value="">Selecione um operador...</option>
                  {attendants.map(a => (
                    <option key={a.id} value={a.id}>
                      #{a.code} - {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LISTA DE ATENDENTES CADASTRADOS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    <span>Equipe de Atendentes e Operadores</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Cadastre os caixas e garçons móveis para identificar as vendas e fichas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewAttendantModal}
                  className="py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Atendente</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {attendants.map(att => {
                  const isCurrent = activeAttendant?.id === att.id;
                  const isCaixa = att.role === 'caixa';
                  return (
                    <div
                      key={att.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-orange-950/20 border-orange-500/80 ring-1 ring-orange-500/50'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-800 text-orange-400">
                            Cód #{att.code}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            att.active ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                          }`}>
                            {att.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        <div>
                          <div className="font-black text-sm text-white">{att.name}</div>
                          <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 text-orange-400 shrink-0" />
                            <span className="truncate">{att.email || 'Sem e-mail cadastrado'}</span>
                          </div>
                        </div>

                        {/* NÍVEL DE ACESSO */}
                        <div className="pt-1">
                          {isCaixa ? (
                            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-2 text-[11px] text-amber-300">
                              <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Caixa (Administrador)</span>
                                <span className="text-[10px] text-neutral-400">Acesso a Vendas, Produtos e Relatórios</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-start gap-2 text-[11px] text-blue-300">
                              <User className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Atendente (PDV)</span>
                                <span className="text-[10px] text-neutral-400">Acesso restrito a efetuar vendas e imprimir</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                        {isCurrent ? (
                          <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Operando Agora
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectActiveAttendant(att)}
                            className="text-[11px] font-bold text-neutral-300 hover:text-orange-400 transition"
                          >
                            Ativar neste aparelho
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditAttendantModal(att)}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttendant(att.id)}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: ADMINISTRADOR GERAL DO SISTEMA                  */}
        {/* ==================================================== */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            
            {/* CARD PRINCIPAL DO ADMINISTRADOR GERAL */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-950/40 shrink-0">
                    <ShieldCheck className="w-7 h-7 text-neutral-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Super Admin / Master
                      </span>
                      {adminUser ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/50 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Sessão Ativa
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-900/50">
                          Sessão Desconectada
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      Administrador Geral
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Conta responsável pelo controle global, configurações fiscais, produtos e relatórios.
                    </p>
                  </div>
                </div>

                {/* BOTÃO DE SESSÃO */}
                {adminUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      supabaseService.logoutAdmin();
                      setAdminUser(null);
                    }}
                    className="py-2.5 px-4 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-xl font-bold text-xs flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar Administrador</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await supabaseService.loginAdmin(
                        MASTER_ADMIN_CREDENTIALS.email,
                        MASTER_ADMIN_CREDENTIALS.password
                      );
                      if (res.success) {
                        setAdminUser(supabaseService.getCurrentAdmin());
                      }
                    }}
                    className="py-2.5 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md shadow-orange-950/40"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Conectar como Administrador Geral</span>
                  </button>
                )}
              </div>

              {/* DADOS CADASTRAIS DO ADMINISTRADOR GERAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* EMAIL */}
                <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2">
                  <div className="text-xs font-semibold text-neutral-400">E-mail Cadastrado</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm sm:text-base font-bold text-white truncate">
                      {MASTER_ADMIN_CREDENTIALS.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(MASTER_ADMIN_CREDENTIALS.email);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition shrink-0"
                      title="Copiar e-mail"
                    >
                      {copiedEmail ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Utilizado para identificação e login administrativo.
                  </div>
                </div>

                {/* SENHA */}
                <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2">
                  <div className="text-xs font-semibold text-neutral-400">Senha do Administrador Geral</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm sm:text-base font-bold text-orange-400 tracking-wider">
                      {showAdminPassword ? MASTER_ADMIN_CREDENTIALS.password : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition"
                        title={showAdminPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(MASTER_ADMIN_CREDENTIALS.password);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition"
                        title="Copiar senha"
                      >
                        {copiedPassword ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Senha mestre com caracteres especiais e números para proteção do PDV.
                  </div>
                </div>

              </div>

              {/* PRIVILÉGIOS E PERMISSÕES MASTER */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Permissões Concedidas ao Administrador Geral
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Produtos & Cardápio</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Adicionar, editar preços, excluir itens e gerenciar categorias com segurança.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Relatórios & Faturamento</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Visualização de métricas de vendas, total por forma de pagamento e ticket médio.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Impressoras & Spooler</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Configurar servidor PC, modo móvel (garçom), largura de papel e cabeçalhos.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Equipe & Atendentes</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Cadastro de operadores de caixa e garçons móveis para identificar fichas.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Dados Fiscais & Evento</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Alteração de razão social/nome do evento, CNPJ, telefone e rodapés de impressão.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Supabase & Cloud Sync</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Acesso ao script SQL de migração e sincronização contínua com banco de dados.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: DADOS DA LOJA & SUPABASE */}
        {/* ==================================================== */}
        {activeTab === 'business' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-orange-500" />
                  <span>Identificação do Estabelecimento / Evento</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Estes dados são impressos no cabeçalho das fichas de atendimento e recibos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Nome da Loja ou Evento:
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    CNPJ ou CPF (Opcional):
                  </label>
                  <input
                    type="text"
                    value={businessDoc}
                    onChange={e => setBusinessDoc(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Telefone de Contato:
                  </label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={e => setBusinessPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (business && onBusinessUpdate) {
                      const updated = {
                        ...business,
                        name: businessName,
                        document: businessDoc,
                        phone: businessPhone
                      };
                      onBusinessUpdate(updated);
                      alert('Dados do estabelecimento atualizados com sucesso!');
                    }
                  }}
                  className="py-2.5 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Dados</span>
                </button>
              </div>
            </div>

            {/* SCRIPT SQL DO BANCO SUPABASE */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span>Estrutura do Banco de Dados (Supabase SQL)</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Script completo incluindo tabelas de vendas, produtos, atendentes e fila de impressão remota (Spooler).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="py-2 px-3.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Script SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-neutral-950 rounded-2xl text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-48 border border-neutral-800 select-all">
                {SQL_SCHEMA_SCRIPT}
              </pre>
            </div>

          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* MODAL: ADICIONAR / EDITAR ATENDENTE */}
      {/* ==================================================== */}
      {isAttendantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-base font-black text-white">
                {editingAttendant ? 'Editar Atendente' : 'Novo Atendente'}
              </h2>
              <button
                onClick={() => setIsAttendantModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendant} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Nome Completo:
                </label>
                <input
                  type="text"
                  required
                  value={attendantForm.name}
                  onChange={e => setAttendantForm({ ...attendantForm, name: e.target.value })}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>

              {/* EMAIL & SENHA DE ACESSO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    <span>E-mail de Acesso:</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={attendantForm.email}
                    onChange={e => setAttendantForm({ ...attendantForm, email: e.target.value })}
                    placeholder="Ex: operador@printfood.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-orange-400" />
                    <span>Senha de Acesso:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAttendantPassword ? 'text' : 'password'}
                      required
                      value={attendantForm.password}
                      onChange={e => setAttendantForm({ ...attendantForm, password: e.target.value })}
                      placeholder="Senha do usuário"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAttendantPassword(!showAttendantPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                      tabIndex={-1}
                    >
                      {showAttendantPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Código / PIN Rápido:
                  </label>
                  <input
                    type="text"
                    required
                    value={attendantForm.code}
                    onChange={e => setAttendantForm({ ...attendantForm, code: e.target.value })}
                    placeholder="Ex: 01"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Nível de Acesso:
                  </label>
                  <select
                    value={attendantForm.role}
                    onChange={e => setAttendantForm({ ...attendantForm, role: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-medium"
                  >
                    <option value="caixa">Caixa (Administrador)</option>
                    <option value="atendente">Atendente (Apenas PDV)</option>
                  </select>
                </div>
              </div>

              {/* INFORMATIVO SOBRE A REGRA DE ACESSO */}
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-[11px] text-neutral-300">
                {attendantForm.role === 'caixa' ? (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 block">Privilégios de Administrador:</strong>
                      <span>O operador de Caixa poderá registrar vendas, emitir fichas no PDV, alterar preços e produtos, e visualizar relatórios de vendas.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-300 block">Acesso Restrito:</strong>
                      <span>O Atendente terá acesso somente para efetuar vendas e imprimir fichas no PDV. Abas de Produtos e Relatórios serão bloqueadas.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attendantForm.active}
                    onChange={e => setAttendantForm({ ...attendantForm, active: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <span className="text-xs font-bold text-neutral-300">
                    Usuário Ativo e Autorizado para Login
                  </span>
                </label>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAttendantModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs transition shadow-md"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST PRINT TICKET MODAL */}
      <TicketPrintModal
        isOpen={testOrderModalOpen}
        onClose={() => setTestOrderModalOpen(false)}
        order={{
          id: 'test-ticket-id',
          business_id: business?.id || '',
          ticket_number: '999',
          customer_name: 'Cliente de Teste (Impressão)',
          total: 82.00,
          payment_method: 'credito',
          payment_status: 'approved',
          order_status: 'pronto',
          created_at: new Date().toISOString()
        }}
        items={[
          { name: 'X-Burger Artesanal Duplo', quantity: 2, unitPrice: 25.00, total: 50.00 },
          { name: 'Batata Frita Rústica G', quantity: 1, unitPrice: 20.00, total: 20.00 },
          { name: 'Refrigerante Lata 350ml', quantity: 2, unitPrice: 6.00, total: 12.00 }
        ]}
        business={business}
      />

    </div>
  );
};
