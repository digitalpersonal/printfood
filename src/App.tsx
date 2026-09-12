import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from './lib/supabase';
import { supabaseService } from './services/supabaseService';
import { Database, AlertCircle, Loader2, Copy, Check, RefreshCw, PlayCircle } from 'lucide-react';
import { Business, Category, Product, PrintJob, Order, AdminUser } from './types';
import { Navbar, NavTab } from './components/layout/Navbar';
import { POSView } from './components/pos/POSView';
import { PickupBoardView } from './components/pickup/PickupBoardView';
import { AdminView } from './components/admin/AdminView';
import { ProductsView } from './components/products/ProductsView';
import { SettingsView } from './components/settings/SettingsView';
import { RemoteJobAlert } from './components/pos/RemoteJobAlert';
import { TicketPrintModal } from './components/pos/TicketPrintModal';
import { AdminLoginModal } from './components/auth/AdminLoginModal';
import { PrintFoodLogo } from './components/common/PrintFoodLogo';
import { SQL_SCHEMA_SCRIPT, DEFAULT_BUSINESS, DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_ATTENDANTS } from './data/initialData';
import { playBeep } from './lib/sound';

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentTab, setCurrentTab] = useState<NavTab>('pdv');
  const [isLoading, setIsLoading] = useState(true);

  // Admin authentication state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(supabaseService.getCurrentAdmin());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [pendingTabAfterAuth, setPendingTabAfterAuth] = useState<NavTab | null>(null);

  // Spooler remote print state
  const [incomingRemoteJob, setIncomingRemoteJob] = useState<PrintJob | null>(null);
  const [activePrintJobModal, setActivePrintJobModal] = useState<{
    order: Order;
    items: { name: string; quantity: number; unitPrice: number; total: number }[];
  } | null>(null);

  const initData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const wasDemo = localStorage.getItem('printfood_is_demo_mode') === 'true';

    if (!isSupabaseConfigured() || wasDemo) {
      supabaseService.setDemoMode(true);
      
      let savedBusiness = localStorage.getItem('printfood_local_business');
      let savedCategories = localStorage.getItem('printfood_local_categories');
      let savedProducts = localStorage.getItem('printfood_local_products');
      let savedAttendants = localStorage.getItem('printfood_local_attendants');

      if (!savedBusiness) {
        localStorage.setItem('printfood_local_business', JSON.stringify(DEFAULT_BUSINESS));
        savedBusiness = JSON.stringify(DEFAULT_BUSINESS);
      }
      if (!savedCategories) {
        localStorage.setItem('printfood_local_categories', JSON.stringify(DEFAULT_CATEGORIES));
        savedCategories = JSON.stringify(DEFAULT_CATEGORIES);
      }
      if (!savedProducts) {
        localStorage.setItem('printfood_local_products', JSON.stringify(DEFAULT_PRODUCTS));
        savedProducts = JSON.stringify(DEFAULT_PRODUCTS);
      }
      if (!savedAttendants) {
        localStorage.setItem('printfood_local_attendants', JSON.stringify(DEFAULT_ATTENDANTS));
        savedAttendants = JSON.stringify(DEFAULT_ATTENDANTS);
      }

      setBusiness(JSON.parse(savedBusiness));
      setCategories(JSON.parse(savedCategories));
      setProducts(JSON.parse(savedProducts));
      
      setIsConnected(true);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    try {
      const { data: bData, error: bError } = await supabaseService.getBusiness();

      if (bError) {
        console.warn('Erro ao consultar Supabase:', bError);
        // Verificar se é erro de tabela inexistente (PGRST205 ou 42P01)
        if (bError.code === 'PGRST205' || bError.code === '42P01' || (bError.message && bError.message.includes('schema cache'))) {
          setErrorMessage("As tabelas ainda não foram criadas no seu banco de dados Supabase (Código PGRST205).");
        } else {
          setErrorMessage(bError.message || "Erro ao conectar com o Supabase.");
        }
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      let activeBusiness = bData;
      if (!activeBusiness) {
        const { data: seeded, error: sError } = await supabaseService.seedInitialData();
        if (sError) {
          console.warn('Erro ao popular dados iniciais:', sError);
          setErrorMessage(sError.message || "Não foi possível criar os dados iniciais.");
          setIsConnected(false);
          setIsLoading(false);
          return;
        }
        activeBusiness = seeded;
      }

      if (activeBusiness) {
        setBusiness(activeBusiness);
        const [cats, prods] = await Promise.all([
          supabaseService.getCategories(activeBusiness.id),
          supabaseService.getProducts(activeBusiness.id)
        ]);
        setCategories(cats);
        setProducts(prods);
        setIsConnected(true);
        setIsDemo(false);
      } else {
        setIsConnected(false);
      }
    } catch (err: any) {
      console.error('Falha geral na inicialização:', err);
      setErrorMessage(err?.message || "Falha na conexão com o banco de dados.");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleStartDemo = () => {
    supabaseService.setDemoMode(true);
    localStorage.setItem('printfood_is_demo_mode', 'true');
    
    let savedBusiness = localStorage.getItem('printfood_local_business');
    let savedCategories = localStorage.getItem('printfood_local_categories');
    let savedProducts = localStorage.getItem('printfood_local_products');
    let savedAttendants = localStorage.getItem('printfood_local_attendants');

    if (!savedBusiness) {
      localStorage.setItem('printfood_local_business', JSON.stringify(DEFAULT_BUSINESS));
      savedBusiness = JSON.stringify(DEFAULT_BUSINESS);
    }
    if (!savedCategories) {
      localStorage.setItem('printfood_local_categories', JSON.stringify(DEFAULT_CATEGORIES));
      savedCategories = JSON.stringify(DEFAULT_CATEGORIES);
    }
    if (!savedProducts) {
      localStorage.setItem('printfood_local_products', JSON.stringify(DEFAULT_PRODUCTS));
      savedProducts = JSON.stringify(DEFAULT_PRODUCTS);
    }
    if (!savedAttendants) {
      localStorage.setItem('printfood_local_attendants', JSON.stringify(DEFAULT_ATTENDANTS));
      savedAttendants = JSON.stringify(DEFAULT_ATTENDANTS);
    }

    setBusiness(JSON.parse(savedBusiness));
    setCategories(JSON.parse(savedCategories));
    setProducts(JSON.parse(savedProducts));
    setIsDemo(true);
    setIsConnected(true);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const refreshProductsAndCategories = async () => {
    if (!business) return;
    const [cats, prods] = await Promise.all([
      supabaseService.getCategories(business.id),
      supabaseService.getProducts(business.id)
    ]);
    setCategories(cats);
    setProducts(prods);
  };

  useEffect(() => {
    if (!business) return;
    const handleProductsUpdated = () => refreshProductsAndCategories();
    const handleCategoriesUpdated = () => refreshProductsAndCategories();

    window.addEventListener('printfood:products-updated', handleProductsUpdated);
    window.addEventListener('printfood:categories-updated', handleCategoriesUpdated);

    return () => {
      window.removeEventListener('printfood:products-updated', handleProductsUpdated);
      window.removeEventListener('printfood:categories-updated', handleCategoriesUpdated);
    };
  }, [business]);

  // Spooler de Impressão (Estação PC recebendo dos celulares)
  useEffect(() => {
    if (!business) return;

    const checkPendingJobs = async () => {
      const config = supabaseService.getPrinterConfig();
      // Não processar jobs remotos se este aparelho for um terminal móvel de envio
      if (config.targetMode === 'mobile_send_to_pc') return;

      const jobs = await supabaseService.getPrintJobs(business.id);
      const pending = jobs.find(j => j.status === 'pending');
      if (pending) {
        playBeep();
        setIncomingRemoteJob(pending);
        await supabaseService.updatePrintJobStatus(pending.id, 'printed');

        if (config.autoPrintOnOrder) {
          handlePrintRemoteJob(pending);
        }
      }
    };

    const handleJobEvent = (e: any) => {
      const job = e.detail as PrintJob;
      const config = supabaseService.getPrinterConfig();
      if (config.targetMode === 'mobile_send_to_pc') return;

      if (job) {
        playBeep();
        setIncomingRemoteJob(job);
        if (config.autoPrintOnOrder) {
          handlePrintRemoteJob(job);
        }
      }
    };

    window.addEventListener('printfood:remote-print-job', handleJobEvent);
    const interval = setInterval(checkPendingJobs, 3500);

    return () => {
      window.removeEventListener('printfood:remote-print-job', handleJobEvent);
      clearInterval(interval);
    };
  }, [business]);

  // Serviço de Backup Automático (IndexedDB)
  useEffect(() => {
    if (!business) return;

    const runBackup = async () => {
      console.log('[Backup] Iniciando backup automático para IndexedDB...');
      const count = await supabaseService.backupRecentOrdersToOffline(business.id);
      if (count > 0) {
        console.log(`[Backup] Sucesso: ${count} pedidos sincronizados offline.`);
      }
    };

    // Executa uma vez no início (com um pequeno delay para não pesar no boot)
    const initialTimeout = setTimeout(runBackup, 10000);
    
    // Agenda a cada 30 minutos
    const interval = setInterval(runBackup, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [business]);

  const handlePrintRemoteJob = (job: PrintJob) => {
    const mockOrder: Order = {
      id: job.order_id || 'rem-' + Date.now(),
      business_id: job.business_id,
      ticket_number: job.ticket_number,
      total: job.total,
      payment_method: job.payment_method,
      payment_status: 'approved',
      order_status: 'pago',
      customer_name: job.customer_name || null,
      attendant_name: job.attendant_name || null,
      created_at: job.created_at
    };

    setActivePrintJobModal({
      order: mockOrder,
      items: job.items
    });
    setIncomingRemoteJob(null);
  };

  const handleOrderCompleted = () => {
    console.log("Pedido salvo com sucesso!");
  };

  useEffect(() => {
    const handleAdminAuthChanged = () => {
      setAdminUser(supabaseService.getCurrentAdmin());
    };
    window.addEventListener('printfood:admin-auth-changed', handleAdminAuthChanged);
    return () => {
      window.removeEventListener('printfood:admin-auth-changed', handleAdminAuthChanged);
    };
  }, []);

  const handleSelectTab = (tab: NavTab) => {
    // Tabs restritas que exigem login do Administrador Geral
    const isRestricted = tab === 'produtos' || tab === 'admin' || tab === 'configuracoes';
    if (isRestricted && !supabaseService.isAdminAuthenticated()) {
      setPendingTabAfterAuth(tab);
      setIsAdminLoginModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  const handleAdminLogout = () => {
    supabaseService.logoutAdmin();
    setAdminUser(null);
    if (currentTab === 'produtos' || currentTab === 'admin' || currentTab === 'configuracoes') {
      setCurrentTab('pdv');
    }
  };

  const handleAdminLoginSuccess = () => {
    const admin = supabaseService.getCurrentAdmin();
    setAdminUser(admin);
    if (pendingTabAfterAuth) {
      setCurrentTab(pendingTabAfterAuth);
      setPendingTabAfterAuth(null);
    }
    setIsAdminLoginModalOpen(false);
  };

  const getTabDisplayName = (tab?: NavTab | null) => {
    switch (tab) {
      case 'produtos': return 'Gestão de Produtos e Cardápio';
      case 'admin': return 'Relatórios Financeiros e Vendas';
      case 'configuracoes': return 'Configurações do Sistema';
      default: return 'Painel Administrativo';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <PrintFoodLogo size="lg" showSubtitle={false} className="mb-3" />
        <Loader2 className="w-7 h-7 text-orange-500 animate-spin mb-3 mt-1" />
        <span className="text-xs font-semibold text-neutral-400">Carregando sistema e sincronizando...</span>
      </div>
    );
  }

  if ((!isSupabaseConfigured() || !isConnected) && !isDemo) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <PrintFoodLogo size="xl" className="mb-6" />

          {!isSupabaseConfigured() ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4 text-center">
              <Database className="w-9 h-9 text-amber-500 mx-auto mb-2" />
              <h2 className="text-base font-bold text-white mb-1">Configuração do Supabase Pendente</h2>
              <p className="text-xs text-neutral-400 mb-4">
                Adicione as variáveis no menu de configurações do AI Studio:
              </p>
              <div className="bg-neutral-900 rounded-xl p-3 text-left font-mono text-xs text-neutral-300 border border-neutral-800 space-y-1">
                <div><span className="text-orange-400">VITE_SUPABASE_URL</span>=https://xyz.supabase.co</div>
                <div><span className="text-orange-400">VITE_SUPABASE_ANON_KEY</span>=eyJhbGci...</div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-white">Tabelas não encontradas no Supabase</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    {errorMessage || "As tabelas do sistema ainda não foram criadas no seu banco de dados."}
                  </p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 mb-3 text-xs text-neutral-300">
                <span className="font-semibold text-neutral-200">Como resolver em 1 minuto:</span>
                <ol className="list-decimal list-inside space-y-1 mt-1.5 text-neutral-400">
                  <li>Clique no botão abaixo para copiar o script SQL;</li>
                  <li>Abra o <strong>SQL Editor</strong> no painel do seu projeto Supabase;</li>
                  <li>Cole e clique em <strong>Run</strong>;</li>
                  <li>Volte aqui e clique em <strong>Tentar Conectar Novamente</strong>.</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopySql}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    copiedSql 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  }`}
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedSql ? 'Script Copiado!' : 'Copiar Script SQL'}
                </button>

                <button
                  onClick={initData}
                  className="py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Conectar
                </button>
              </div>
            </div>
          )}

          {/* DEMO MODE OPTION */}
          <div className="pt-2 border-t border-neutral-800 text-center">
            <button
              onClick={handleStartDemo}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 hover:from-orange-600/30 hover:to-amber-600/30 border border-orange-500/40 text-orange-400 hover:text-orange-300 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Experimentar Agora no Modo Demonstração</span>
            </button>
            <p className="text-[11px] text-neutral-500 mt-2">
              Teste todas as funcionalidades do PDV, pedidos, fichas e painéis instantaneamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar 
        currentTab={currentTab} 
        onSelectTab={handleSelectTab} 
        business={business} 
        adminUser={adminUser}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {isDemo && (
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Modo Demonstração Ativo (Dados salvos localmente)</span>
          </div>
          <button
            onClick={() => {
              supabaseService.setDemoMode(false);
              setIsDemo(false);
              initData();
            }}
            className="text-[11px] font-bold underline hover:text-white"
          >
            Tentar conectar com Supabase
          </button>
        </div>
      )}
      
      <main className="flex-1 flex flex-col">
        {currentTab === 'pdv' && (
          <POSView 
            business={business} 
            categories={categories} 
            products={products} 
            onOrderCompleted={handleOrderCompleted}
          />
        )}
        
        {currentTab === 'retirada' && (
          <PickupBoardView business={business} />
        )}

        {currentTab === 'produtos' && (
          <ProductsView
            business={business}
            categories={categories}
            products={products}
            onRefreshData={refreshProductsAndCategories}
          />
        )}

        {currentTab === 'admin' && (
          <AdminView 
            business={business} 
            onNavigateToProducts={() => setCurrentTab('produtos')}
          />
        )}

        {currentTab === 'configuracoes' && (
          <SettingsView business={business} onBusinessUpdate={setBusiness} />
        )}
      </main>

      {/* ALERTA FLUTUANTE DE FICHA REMOTA RECEBIDA (SPOOLER PC) */}
      <RemoteJobAlert
        job={incomingRemoteJob}
        onClose={() => setIncomingRemoteJob(null)}
        onPrint={handlePrintRemoteJob}
      />

      {/* MODAL DE IMPRESSÃO DA FICHA REMOTA RECEBIDA */}
      {activePrintJobModal && (
        <TicketPrintModal
          isOpen={true}
          onClose={() => setActivePrintJobModal(null)}
          order={activePrintJobModal.order}
          items={activePrintJobModal.items}
          business={business}
        />
      )}

      {/* MODAL DE AUTENTICAÇÃO DO ADMINISTRADOR GERAL */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => {
          setIsAdminLoginModalOpen(false);
          setPendingTabAfterAuth(null);
        }}
        onSuccess={handleAdminLoginSuccess}
        targetTabName={getTabDisplayName(pendingTabAfterAuth)}
      />
    </div>
  );
}
