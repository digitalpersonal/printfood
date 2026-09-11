import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Business, Category, Product, Order, OrderItem, Attendant, PrinterConfig, PrintJob, AdminUser, SystemUser } from '../types';
import { DEFAULT_BUSINESS, DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_ATTENDANTS, DEFAULT_PRINTER_CONFIG, DEFAULT_ADMIN, MASTER_ADMIN_CREDENTIALS } from '../data/initialData';
import { saveOrderOffline, savePrintJobOffline, getOrdersOffline, getPrintJobsOffline } from '../lib/offlineDb';

const LOCAL_ORDERS_KEY = 'printfood_local_orders';
const LOCAL_BUSINESS_KEY = 'printfood_local_business';
const LOCAL_ATTENDANTS_KEY = 'printfood_local_attendants';
const LOCAL_ACTIVE_ATTENDANT_KEY = 'printfood_active_attendant';
const LOCAL_PRINTER_CONFIG_KEY = 'printfood_printer_config';
const LOCAL_PRINT_JOBS_KEY = 'printfood_local_print_jobs';
const LOCAL_PRODUCTS_KEY = 'printfood_local_products';
const LOCAL_CATEGORIES_KEY = 'printfood_local_categories';
const LOCAL_ADMIN_AUTH_KEY = 'printfood_admin_auth';

async function saveLocalOrderUnified(newOrder: Order) {
  try {
    await saveOrderOffline(newOrder);
  } catch (e) {
    console.warn('IndexedDB save failed:', e);
  }
  try {
    const localOrders: Order[] = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    const existingIndex = localOrders.findIndex(o => o.id === newOrder.id);
    if (existingIndex >= 0) {
      localOrders[existingIndex] = newOrder;
    } else {
      localOrders.unshift(newOrder);
    }
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

async function getLocalOrdersUnified(): Promise<Order[]> {
  let orders: Order[] = [];
  try {
    orders = await getOrdersOffline();
  } catch (e) {
    console.warn('IndexedDB read failed:', e);
  }
  if (!orders || orders.length === 0) {
    try {
      const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (saved) {
        orders = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
    }
  }
  return orders || [];
}

export const supabaseService = {
  isDemoMode: false,
  lastCleanupTime: 0,

  setDemoMode(enabled: boolean) {
    this.isDemoMode = enabled;
  },

  async getBusiness(): Promise<{ data: Business | null; error: any }> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const saved = localStorage.getItem(LOCAL_BUSINESS_KEY);
      return { data: saved ? JSON.parse(saved) : DEFAULT_BUSINESS, error: null };
    }

    try {
      const { data, error } = await supabase.from('business').select('*').limit(1).maybeSingle();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async updateBusiness(business: Business): Promise<Business> {
    localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(business));
    
    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('business')
          .update({
            name: business.name,
            document: business.document,
            phone: business.phone
          })
          .eq('id', business.id)
          .select()
          .single();
        if (data) return data;
      } catch (err) {
        console.warn('Supabase business update failed, using local:', err);
      }
    }
    return business;
  },

  async getCategories(businessId: string, _force?: boolean): Promise<Category[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId)
        .order('display_order');
      
      if (error || !data || data.length === 0) {
        const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
      }
      return data;
    } catch {
      const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    }
  },

  async saveCategory(categoryData: {
    id?: string;
    business_id: string;
    name: string;
    display_order?: number;
    active?: boolean;
  }): Promise<Category> {
    const category: Category = {
      id: categoryData.id || ('cat-' + Date.now()),
      business_id: categoryData.business_id,
      name: categoryData.name.trim(),
      display_order: Number(categoryData.display_order) || 1,
      active: categoryData.active !== undefined ? categoryData.active : true
    };
    const categories = await this.getCategories(category.business_id);
    const existingIndex = categories.findIndex(c => c.id === category.id);
    let updated: Category[];
    if (existingIndex >= 0) {
      updated = categories.map(c => c.id === category.id ? category : c);
    } else {
      updated = [...categories, category];
    }
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updated));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('categories').upsert([category]);
      } catch (err) {
        console.warn('Erro ao salvar categoria no Supabase:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('printfood:categories-updated', { detail: category }));
    return category;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const categories = JSON.parse(localStorage.getItem(LOCAL_CATEGORIES_KEY) || JSON.stringify(DEFAULT_CATEGORIES));
    const updated = categories.filter((c: Category) => c.id !== id);
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updated));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('products').update({ category_id: null }).eq('category_id', id);
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar categoria no Supabase:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('printfood:categories-updated', { detail: { id, deleted: true } }));
    window.dispatchEvent(new CustomEvent('printfood:products-updated', { detail: { categoryDeleted: id } }));
    return true;
  },

  async seedInitialData(): Promise<{ data: Business | null; error: any }> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(DEFAULT_BUSINESS));
      return { data: DEFAULT_BUSINESS, error: null };
    }

    try {
      const { data: businessData, error: bError } = await supabase.from('business').insert([{
        name: 'PrintFood - Caixa Central',
        document: '12.345.678/0001-90',
        phone: '(11) 98765-4321'
      }]).select().single();

      if (bError || !businessData) return { data: null, error: bError };

      const categories = [
        { business_id: businessData.id, name: 'Lanches', display_order: 1, active: true },
        { business_id: businessData.id, name: 'Bebidas', display_order: 2, active: true },
        { business_id: businessData.id, name: 'Porções', display_order: 3, active: true },
        { business_id: businessData.id, name: 'Sobremesas', display_order: 4, active: true }
      ];

      const { data: catData, error: cError } = await supabase.from('categories').insert(categories).select();
      if (cError) return { data: businessData, error: cError };

      const catMap = new Map(catData?.map((c: any) => [c.name, c.id]) || []);
      const products = [
        { business_id: businessData.id, category_id: catMap.get('Lanches'), name: 'X-Burger Artesanal', description: 'Pão brioche, carne 160g, queijo cheddar e molho especial', price: 28.90, active: true },
        { business_id: businessData.id, category_id: catMap.get('Lanches'), name: 'X-Salada Bacon', description: 'Pão, carne 160g, queijo, bacon crocante, alface e tomate', price: 34.90, active: true },
        { business_id: businessData.id, category_id: catMap.get('Bebidas'), name: 'Coca-Cola Lata 350ml', description: 'Gelada', price: 6.50, active: true },
        { business_id: businessData.id, category_id: catMap.get('Bebidas'), name: 'Suco Natural de Laranja 500ml', description: 'Feito na hora', price: 9.00, active: true },
        { business_id: businessData.id, category_id: catMap.get('Porções'), name: 'Batata Frita com Cheddar e Bacon', description: 'Porção grande crocante', price: 38.00, active: true }
      ];

      await supabase.from('products').insert(products);

      localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(businessData));
      if (catData) localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(catData));

      return { data: businessData, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async getProducts(businessId: string, _force?: boolean): Promise<Product[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('name');
      
      if (error || !data || data.length === 0) {
        const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
      }
      return data;
    } catch {
      const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    }
  },

  getLocalProducts(): Product[] {
    const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  },

  getLocalCategories(): Category[] {
    const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  },

  async saveProduct(productData: {
    id?: string;
    business_id: string;
    category_id?: string | null;
    name: string;
    description?: string | null;
    price: number;
    active?: boolean;
    display_order?: number;
  }): Promise<Product> {
    const cleanProduct: Product = {
      id: productData.id || ('prod-' + Date.now()),
      business_id: productData.business_id,
      category_id: productData.category_id || null,
      name: productData.name.trim(),
      description: productData.description?.trim() || null,
      price: Number(productData.price) || 0,
      active: productData.active !== undefined ? productData.active : true,
      display_order: Number(productData.display_order) || 1
    };

    const local = this.getLocalProducts();
    const existingIdx = local.findIndex(p => p.id === cleanProduct.id);
    let updatedLocal: Product[];
    if (existingIdx >= 0) {
      updatedLocal = [...local];
      updatedLocal[existingIdx] = cleanProduct;
    } else {
      updatedLocal = [...local, cleanProduct];
    }
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updatedLocal));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('products').upsert([cleanProduct]);
      } catch (err) {
        console.warn('Fallback to local product saving:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('printfood:products-updated', { detail: cleanProduct }));
    return cleanProduct;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const local = this.getLocalProducts();
    const filtered = local.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(filtered));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar produto no Supabase:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('printfood:products-updated', { detail: { id, deleted: true } }));
    return true;
  },

  async toggleProductActive(id: string, active: boolean): Promise<boolean> {
    const local = this.getLocalProducts();
    const updated = local.map(p => p.id === id ? { ...p, active } : p);
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('products').update({ active }).eq('id', id);
      } catch (err) {
        console.warn('Erro ao alternar status do produto no Supabase:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('printfood:products-updated', { detail: { id, active } }));
    return true;
  },

  async getTodayOrders(businessId: string): Promise<Order[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const allOrders = await getLocalOrdersUnified();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return allOrders.filter(o => new Date(o.created_at || Date.now()) >= today);
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        for (const order of data) {
          await saveLocalOrderUnified(order);
        }
        return data;
      }

      // If online table is empty or failed, fallback to local unified store
      const allOrders = await getLocalOrdersUnified();
      return allOrders.filter(o => new Date(o.created_at || Date.now()) >= today);
    } catch {
      const allOrders = await getLocalOrdersUnified();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return allOrders.filter(o => new Date(o.created_at || Date.now()) >= today);
    }
  },

  async getAllOrders(businessId: string): Promise<Order[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      return await getLocalOrdersUnified();
    }

    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) return data;
      return await getLocalOrdersUnified();
    } catch {
      return await getLocalOrdersUnified();
    }
  },

  async createOrder(
    orderData: Omit<Order, 'id' | 'created_at' | 'ticket_number'>, 
    items: Omit<OrderItem, 'id' | 'order_id'>[]
  ): Promise<Order | null> {
    const allOrders = await getLocalOrdersUnified();
    const nextNumber = String(allOrders.length + 1).padStart(3, '0');

    if (this.isDemoMode || !isSupabaseConfigured()) {
      const newOrder: Order = {
        id: 'ord-' + Date.now(),
        business_id: orderData.business_id,
        ticket_number: nextNumber,
        total: orderData.total,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        order_status: orderData.order_status,
        customer_name: orderData.customer_name,
        attendant_name: orderData.attendant_name || null,
        created_at: new Date().toISOString()
      };
      await saveLocalOrderUnified(newOrder);
      window.dispatchEvent(new CustomEvent('printfood:order-created', { detail: newOrder }));
      return newOrder;
    }

    try {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', orderData.business_id);
      
      const nextTicketNumber = String((count || 0) + 1).padStart(3, '0');

      const { data: order, error: oError } = await supabase
        .from('orders')
        .insert([{ ...orderData, ticket_number: nextTicketNumber }])
        .select()
        .single();

      if (oError || !order) throw oError;

      await saveLocalOrderUnified(order);

      const itemsToInsert = items.map(item => ({
        ...item,
        order_id: order.id
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      window.dispatchEvent(new CustomEvent('printfood:order-created', { detail: order }));
      return order;
    } catch (err) {
      console.warn('Fallback para armazenamento local unificado:', err);
      const newOrder: Order = {
        id: 'ord-' + Date.now(),
        business_id: orderData.business_id,
        ticket_number: nextNumber,
        total: orderData.total,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        order_status: orderData.order_status,
        customer_name: orderData.customer_name,
        attendant_name: orderData.attendant_name || null,
        created_at: new Date().toISOString()
      };
      await saveLocalOrderUnified(newOrder);
      window.dispatchEvent(new CustomEvent('printfood:order-created', { detail: newOrder }));
      return newOrder;
    }
  },

  async updateOrderStatus(orderId: string, newStatus: string): Promise<boolean> {
    // Always update local unified store first for instant UI reaction
    const allOrders = await getLocalOrdersUnified();
    const updatedOrders = allOrders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o);
    const targetOrder = updatedOrders.find(o => o.id === orderId);
    if (targetOrder) {
      await saveLocalOrderUnified(targetOrder);
    }
    window.dispatchEvent(new CustomEvent('printfood:order-updated', { detail: { id: orderId, status: newStatus } }));

    if (this.isDemoMode || !isSupabaseConfigured()) {
      return true;
    }

    try {
      const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase status update failed, local updated:', err);
      return true;
    }
  },

  // ----------------------------------------------------
  // ATENDENTES / OPERADORES
  // ----------------------------------------------------
  async getAttendants(businessId: string): Promise<Attendant[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const saved = localStorage.getItem(LOCAL_ATTENDANTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ATTENDANTS;
    }

    try {
      const { data, error } = await supabase
        .from('attendants')
        .select('*')
        .eq('business_id', businessId)
        .order('name');
      
      if (error || !data || data.length === 0) {
        const saved = localStorage.getItem(LOCAL_ATTENDANTS_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_ATTENDANTS;
      }
      return data;
    } catch {
      const saved = localStorage.getItem(LOCAL_ATTENDANTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ATTENDANTS;
    }
  },

  async saveAttendant(attendant: Partial<Attendant> & { business_id: string }): Promise<Attendant | null> {
    const isNew = !attendant.id;
    const attendantToSave: Attendant = {
      id: attendant.id || 'att-' + Date.now(),
      business_id: attendant.business_id,
      name: attendant.name || 'Novo Atendente',
      email: (attendant.email || '').trim().toLowerCase(),
      password: attendant.password || '',
      code: attendant.code || String(Math.floor(10 + Math.random() * 90)),
      role: attendant.role === 'caixa' ? 'caixa' : 'atendente',
      active: attendant.active !== undefined ? attendant.active : true,
      created_at: attendant.created_at || new Date().toISOString()
    };

    if (this.isDemoMode || !isSupabaseConfigured()) {
      const attendants: Attendant[] = JSON.parse(localStorage.getItem(LOCAL_ATTENDANTS_KEY) || JSON.stringify(DEFAULT_ATTENDANTS));
      const index = attendants.findIndex(a => a.id === attendantToSave.id);
      if (index >= 0) {
        attendants[index] = attendantToSave;
      } else {
        attendants.push(attendantToSave);
      }
      localStorage.setItem(LOCAL_ATTENDANTS_KEY, JSON.stringify(attendants));
      return attendantToSave;
    }

    try {
      let result;
      if (isNew) {
        const { data, error } = await supabase.from('attendants').insert([attendantToSave]).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.from('attendants').update(attendantToSave).eq('id', attendantToSave.id).select().single();
        if (error) throw error;
        result = data;
      }
      return result;
    } catch (err) {
      console.warn('Fallback local para salvar atendente:', err);
      const attendants: Attendant[] = JSON.parse(localStorage.getItem(LOCAL_ATTENDANTS_KEY) || JSON.stringify(DEFAULT_ATTENDANTS));
      const index = attendants.findIndex(a => a.id === attendantToSave.id);
      if (index >= 0) {
        attendants[index] = attendantToSave;
      } else {
        attendants.push(attendantToSave);
      }
      localStorage.setItem(LOCAL_ATTENDANTS_KEY, JSON.stringify(attendants));
      return attendantToSave;
    }
  },

  async deleteAttendant(id: string): Promise<boolean> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const attendants: Attendant[] = JSON.parse(localStorage.getItem(LOCAL_ATTENDANTS_KEY) || JSON.stringify(DEFAULT_ATTENDANTS));
      const filtered = attendants.filter(a => a.id !== id);
      localStorage.setItem(LOCAL_ATTENDANTS_KEY, JSON.stringify(filtered));
      return true;
    }

    try {
      const { error } = await supabase.from('attendants').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch {
      const attendants: Attendant[] = JSON.parse(localStorage.getItem(LOCAL_ATTENDANTS_KEY) || JSON.stringify(DEFAULT_ATTENDANTS));
      const filtered = attendants.filter(a => a.id !== id);
      localStorage.setItem(LOCAL_ATTENDANTS_KEY, JSON.stringify(filtered));
      return true;
    }
  },

  getActiveAttendant(): Attendant | null {
    const saved = localStorage.getItem(LOCAL_ACTIVE_ATTENDANT_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_ATTENDANTS[0];
  },

  setActiveAttendant(attendant: Attendant | null) {
    if (!attendant) {
      localStorage.removeItem(LOCAL_ACTIVE_ATTENDANT_KEY);
    } else {
      localStorage.setItem(LOCAL_ACTIVE_ATTENDANT_KEY, JSON.stringify(attendant));
    }
    window.dispatchEvent(new CustomEvent('printfood:attendant-changed', { detail: attendant }));
  },

  // ----------------------------------------------------
  // CONFIGURAÇÃO DE IMPRESSORA & ESTAÇÃO
  // ----------------------------------------------------
  getPrinterConfig(): PrinterConfig {
    const saved = localStorage.getItem(LOCAL_PRINTER_CONFIG_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_PRINTER_CONFIG;
      }
    }
    return DEFAULT_PRINTER_CONFIG;
  },

  savePrinterConfig(config: PrinterConfig): void {
    localStorage.setItem(LOCAL_PRINTER_CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('printfood:printer-config-changed', { detail: config }));
  },

  // ----------------------------------------------------
  // IMPRESSÃO REMOTA: CELULAR -> PC SPOOLER
  // ----------------------------------------------------
  async dispatchRemotePrintJob(jobData: Omit<PrintJob, 'id' | 'created_at' | 'status'>): Promise<PrintJob> {
    const newJob: PrintJob = {
      ...jobData,
      id: 'print-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Sempre salva localmente e dispara evento para testes na mesma máquina / rede
    const localJobs: PrintJob[] = JSON.parse(localStorage.getItem(LOCAL_PRINT_JOBS_KEY) || '[]');
    localJobs.unshift(newJob);
    if (localJobs.length > 50) localJobs.pop();
    localStorage.setItem(LOCAL_PRINT_JOBS_KEY, JSON.stringify(localJobs));
    
    window.dispatchEvent(new CustomEvent('printfood:remote-print-job', { detail: newJob }));

    // Se o Supabase estiver configurado e não estiver em modo demo puro, insere na tabela para sincronia entre celular e PC
    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('print_jobs').insert([{
          id: newJob.id,
          business_id: newJob.business_id,
          order_id: newJob.order_id,
          ticket_number: newJob.ticket_number,
          source_device: newJob.source_device,
          attendant_name: newJob.attendant_name,
          customer_name: newJob.customer_name,
          payload: {
            items: newJob.items,
            total: newJob.total,
            payment_method: newJob.payment_method
          },
          status: 'pending'
        }]);
      } catch (err) {
        console.warn('Erro ao sincronizar job remoto com Supabase:', err);
      }
    }

    return newJob;
  },

  async getPrintJobs(businessId: string): Promise<PrintJob[]> {
    // Tenta limpar jobs expirados antes de retornar a lista
    await this.cleanupExpiredPrintJobs(businessId);

    if (this.isDemoMode || !isSupabaseConfigured()) {
      const saved = localStorage.getItem(LOCAL_PRINT_JOBS_KEY);
      return saved ? JSON.parse(saved) : [];
    }

    try {
      const { data, error } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error || !data) {
        return await getPrintJobsOffline();
      }

      const jobs = data.map((d: any) => ({
        id: d.id,
        business_id: d.business_id,
        order_id: d.order_id,
        ticket_number: d.ticket_number,
        source_device: d.source_device,
        attendant_name: d.attendant_name,
        customer_name: d.customer_name,
        items: d.payload?.items || [],
        total: d.payload?.total || 0,
        payment_method: d.payload?.payment_method || 'outro',
        status: d.status,
        created_at: d.created_at
      }));

      for (const job of jobs) {
        await savePrintJobOffline(job);
      }
      return jobs;
    } catch {
      return await getPrintJobsOffline();
    }
  },

  async updatePrintJobStatus(jobId: string, status: 'pending' | 'printed' | 'failed'): Promise<boolean> {
    const localJobs: PrintJob[] = JSON.parse(localStorage.getItem(LOCAL_PRINT_JOBS_KEY) || '[]');
    const updated = localJobs.map(j => j.id === jobId ? { ...j, status } : j);
    localStorage.setItem(LOCAL_PRINT_JOBS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('printfood:print-job-updated', { detail: { id: jobId, status } }));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('print_jobs').update({ status }).eq('id', jobId);
      } catch (err) {
        console.warn('Erro ao atualizar status do job no Supabase:', err);
      }
    }
    return true;
  },

  async clearPrintJobs(businessId: string): Promise<boolean> {
    localStorage.removeItem(LOCAL_PRINT_JOBS_KEY);
    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase.from('print_jobs').delete().eq('business_id', businessId);
      } catch (err) {
        console.warn('Erro ao limpar jobs no Supabase:', err);
      }
    }
    return true;
  },

  async cleanupExpiredPrintJobs(businessId: string): Promise<void> {
    const now = Date.now();
    // Executa a limpeza a cada 10 minutos no máximo para evitar excesso de requisições
    if (now - this.lastCleanupTime < 10 * 60 * 1000) return;
    this.lastCleanupTime = now;

    const config = this.getPrinterConfig();
    const hours = config.autoCleanupHours || 0;
    if (hours <= 0) return;

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    const cutoffIso = cutoff.toISOString();

    // 1. Limpeza no LocalStorage
    const localJobsRaw = localStorage.getItem(LOCAL_PRINT_JOBS_KEY);
    if (localJobsRaw) {
      try {
        const localJobs: PrintJob[] = JSON.parse(localJobsRaw);
        const filteredJobs = localJobs.filter(job => {
          // Mantém jobs já impressos ou falhados, limpa apenas pendentes antigos
          if (job.status !== 'pending') return true;
          return new Date(job.created_at) >= cutoff;
        });
        if (filteredJobs.length !== localJobs.length) {
          localStorage.setItem(LOCAL_PRINT_JOBS_KEY, JSON.stringify(filteredJobs));
        }
      } catch (e) {
        /* ignore */
      }
    }

    // 2. Limpeza no Supabase
    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        await supabase
          .from('print_jobs')
          .delete()
          .eq('business_id', businessId)
          .eq('status', 'pending')
          .lt('created_at', cutoffIso);
      } catch (err) {
        console.warn('Erro ao limpar jobs expirados no Supabase:', err);
      }
    }
  },

  async backupRecentOrdersToOffline(businessId: string): Promise<number> {
    if (this.isDemoMode || !isSupabaseConfigured()) return 0;

    try {
      // Backup das últimas 24 horas para garantir que o histórico recente esteja offline
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', yesterday.toISOString());
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        let backedUpCount = 0;
        for (const order of data) {
          await saveOrderOffline(order);
          backedUpCount++;
        }
        return backedUpCount;
      }
      return 0;
    } catch (err) {
      console.warn('Falha ao realizar backup automático para IndexedDB:', err);
      return 0;
    }
  },

  // ==========================================
  // AUTENTICAÇÃO DO ADMINISTRADOR GERAL
  // ==========================================
  getMasterAdminInfo(): { email: string; name: string; role: 'admin_geral' } {
    return DEFAULT_ADMIN;
  },

  getCurrentAdmin(): AdminUser | null {
    try {
      const saved = localStorage.getItem(LOCAL_ADMIN_AUTH_KEY);
      if (!saved) return null;
      const parsed: SystemUser = JSON.parse(saved);
      if (parsed && parsed.email) {
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  },

  getCurrentUser(): SystemUser | null {
    return this.getCurrentAdmin() as any;
  },

  getCurrentSessionUser(): SystemUser | null {
    try {
      const saved = localStorage.getItem(LOCAL_ADMIN_AUTH_KEY);
      if (!saved) return null;
      const parsed: SystemUser = JSON.parse(saved);
      if (parsed && parsed.email) {
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  },

  isAdminAuthenticated(): boolean {
    const user = this.getCurrentSessionUser();
    return !!user && (user.role === 'admin_geral' || user.role === 'caixa');
  },

  isUserAdmin(): boolean {
    return this.isAdminAuthenticated();
  },

  isUserAtendente(): boolean {
    const user = this.getCurrentSessionUser();
    return !!user && user.role === 'atendente';
  },

  async login(
    emailInput: string, 
    passwordInput: string
  ): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Informe o e-mail e a senha de acesso.' };
    }

    const expectedEmail = MASTER_ADMIN_CREDENTIALS.email.toLowerCase();
    const expectedPassword = MASTER_ADMIN_CREDENTIALS.password;

    // 1. Administrador Geral (Master)
    if (cleanEmail === expectedEmail && cleanPassword === expectedPassword) {
      const user: SystemUser = {
        email: MASTER_ADMIN_CREDENTIALS.email,
        name: DEFAULT_ADMIN.name,
        role: 'admin_geral',
        authenticated_at: new Date().toISOString()
      };

      localStorage.setItem(LOCAL_ADMIN_AUTH_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('printfood:admin-auth-changed', { detail: user }));
      return { success: true, user };
    }

    // 2. Atendentes e Caixas previamente cadastrados
    try {
      let attendantsList: Attendant[] = [];
      const saved = localStorage.getItem(LOCAL_ATTENDANTS_KEY);
      if (saved) {
        try {
          attendantsList = JSON.parse(saved);
        } catch {
          attendantsList = DEFAULT_ATTENDANTS;
        }
      } else {
        attendantsList = DEFAULT_ATTENDANTS;
      }

      // Se conectado ao Supabase, tenta carregar atualizado
      if (isSupabaseConfigured() && !this.isDemoMode) {
        try {
          const { data } = await supabase.from('attendants').select('*').eq('active', true);
          if (data && data.length > 0) {
            attendantsList = data;
          }
        } catch {
          /* fallback para a lista local */
        }
      }

      const matched = attendantsList.find(a => 
        a.active !== false &&
        (a.email || '').trim().toLowerCase() === cleanEmail &&
        (a.password || '').trim() === cleanPassword
      );

      if (matched) {
        const user: SystemUser = {
          id: matched.id,
          email: matched.email,
          name: matched.name,
          role: matched.role === 'caixa' ? 'caixa' : 'atendente',
          business_id: matched.business_id,
          authenticated_at: new Date().toISOString()
        };

        localStorage.setItem(LOCAL_ADMIN_AUTH_KEY, JSON.stringify(user));
        this.setActiveAttendant(matched);
        window.dispatchEvent(new CustomEvent('printfood:admin-auth-changed', { detail: user }));
        return { success: true, user };
      }
    } catch (err) {
      console.warn('Erro ao validar credenciais:', err);
    }

    // 3. Fallback: Supabase Auth nativo
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (!error && data?.user) {
          const user: SystemUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            name: data.user.user_metadata?.name || 'Operador',
            role: (data.user.user_metadata?.role as any) || 'caixa',
            authenticated_at: new Date().toISOString()
          };
          localStorage.setItem(LOCAL_ADMIN_AUTH_KEY, JSON.stringify(user));
          window.dispatchEvent(new CustomEvent('printfood:admin-auth-changed', { detail: user }));
          return { success: true, user };
        }
      } catch {
        /* ignore */
      }
    }

    return { 
      success: false, 
      error: 'E-mail ou senha inválidos. Verifique suas credenciais de Atendente ou Caixa.' 
    };
  },

  async loginAdmin(
    emailInput: string, 
    passwordInput: string
  ): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    const res = await this.login(emailInput, passwordInput);
    if (res.success && res.user) {
      return {
        success: true,
        admin: {
          email: res.user.email,
          name: res.user.name,
          role: 'admin_geral',
          authenticated_at: res.user.authenticated_at
        }
      };
    }
    return { success: false, error: res.error };
  },

  logout(): void {
    localStorage.removeItem(LOCAL_ADMIN_AUTH_KEY);
    if (isSupabaseConfigured()) {
      try {
        supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    window.dispatchEvent(new CustomEvent('printfood:admin-auth-changed', { detail: null }));
  },

  logoutAdmin(): void {
    this.logout();
  }
};
