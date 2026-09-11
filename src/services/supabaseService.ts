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
        const { data, error } = await supabase
          .from('business')
          .update({
            name: business.name,
            document: business.document,
            phone: business.phone
          })
          .eq('id', business.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Erro ao atualizar empresa no Supabase, salvando local:', err);
      }
    }
    return business;
  },

  async seedInitialData(): Promise<{ data: Business | null; error: any }> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(DEFAULT_BUSINESS));
      return { data: DEFAULT_BUSINESS, error: null };
    }

    try {
      // 1. Criar empresa PrintFood
      const { data: businessData, error: bError } = await supabase.from('business').insert([{
        name: 'PrintFood - Caixa Central',
        document: '12.345.678/0001-90',
        phone: '(11) 98765-4321'
      }]).select().single();

      if (bError || !businessData) return { data: null, error: bError };

      // 2. Criar categorias
      const categories = [
        { business_id: businessData.id, name: 'Bebidas', display_order: 1 },
        { business_id: businessData.id, name: 'Lanches', display_order: 2 },
        { business_id: businessData.id, name: 'Porções', display_order: 3 },
        { business_id: businessData.id, name: 'Doces', display_order: 4 },
      ];
      
      const { data: catData, error: cError } = await supabase.from('categories').insert(categories).select();
      if (cError || !catData) return { data: businessData, error: cError };

      const catBebidas = (catData as any[]).find((c: any) => c.name === 'Bebidas')?.id;
      const catLanches = (catData as any[]).find((c: any) => c.name === 'Lanches')?.id;
      const catPorcoes = (catData as any[]).find((c: any) => c.name === 'Porções')?.id;

      // 3. Criar produtos
      const products = [
        { business_id: businessData.id, category_id: catBebidas, name: 'Água Mineral 500ml', price: 4.00, display_order: 1 },
        { business_id: businessData.id, category_id: catBebidas, name: 'Refrigerante Lata', price: 7.00, display_order: 2 },
        { business_id: businessData.id, category_id: catBebidas, name: 'Chopp Artesanal 400ml', price: 14.00, display_order: 3 },
        { business_id: businessData.id, category_id: catLanches, name: 'Hambúrguer Artesanal', price: 26.00, display_order: 4 },
        { business_id: businessData.id, category_id: catLanches, name: 'Pastel Especial de Carne', price: 12.00, display_order: 5 },
        { business_id: businessData.id, category_id: catLanches, name: 'Pastel de Queijo', price: 12.00, display_order: 6 },
        { business_id: businessData.id, category_id: catPorcoes, name: 'Batata Frita Crocante', price: 28.00, display_order: 7 },
      ];

      await supabase.from('products').insert(products);
      
      return { data: businessData, error: null };
    } catch (err) {
      console.error('Error seeding data:', err);
      return { data: null, error: err };
    }
  },

  getLocalCategories(): Category[] {
    const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  },

  getLocalProducts(): Product[] {
    const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  },

  async getCategories(businessId: string, includeInactive: boolean = false): Promise<Category[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const cats = this.getLocalCategories();
      return includeInactive ? cats : cats.filter(c => c.active !== false);
    }

    try {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId);
      
      if (!includeInactive) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query.order('display_order');
      if (error || !data) {
        const local = this.getLocalCategories();
        return includeInactive ? local : local.filter(c => c.active !== false);
      }
      return data;
    } catch {
      const local = this.getLocalCategories();
      return includeInactive ? local : local.filter(c => c.active !== false);
    }
  },

  async getProducts(businessId: string, includeInactive: boolean = false): Promise<Product[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const prods = this.getLocalProducts();
      return includeInactive ? prods : prods.filter(p => p.active !== false);
    }

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);

      if (!includeInactive) {
        query = query.eq('active', true);
      }

      const { data, error } = await query.order('display_order');
      if (error || !data) {
        const local = this.getLocalProducts();
        return includeInactive ? local : local.filter(p => p.active !== false);
      }
      return data;
    } catch {
      const local = this.getLocalProducts();
      return includeInactive ? local : local.filter(p => p.active !== false);
    }
  },

  async saveProduct(productData: {
    id?: string;
    business_id: string;
    category_id: string | null;
    name: string;
    price: number;
    description?: string | null;
    active?: boolean;
    display_order?: number;
  }): Promise<Product> {
    const isEditing = !!productData.id;
    const cleanProduct: Product = {
      id: productData.id || ('prod-' + Date.now()),
      business_id: productData.business_id,
      category_id: productData.category_id || null,
      name: productData.name.trim(),
      price: Number(productData.price) || 0,
      description: productData.description?.trim() || null,
      active: productData.active !== undefined ? productData.active : true,
      display_order: Number(productData.display_order) || 1
    };

    // Update local storage backup
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
        if (isEditing) {
          const { data, error } = await supabase
            .from('products')
            .update({
              category_id: cleanProduct.category_id,
              name: cleanProduct.name,
              price: cleanProduct.price,
              description: cleanProduct.description,
              active: cleanProduct.active,
              display_order: cleanProduct.display_order
            })
            .eq('id', cleanProduct.id)
            .select()
            .single();

          if (!error && data) {
            window.dispatchEvent(new CustomEvent('printfood:products-updated', { detail: data }));
            return data;
          }
        } else {
          // If inserting into Supabase, omit custom id if it was client generated, or let Supabase assign UUID
          const { data, error } = await supabase
            .from('products')
            .insert([{
              business_id: cleanProduct.business_id,
              category_id: cleanProduct.category_id,
              name: cleanProduct.name,
              price: cleanProduct.price,
              description: cleanProduct.description,
              active: cleanProduct.active,
              display_order: cleanProduct.display_order
            }])
            .select()
            .single();

          if (!error && data) {
            window.dispatchEvent(new CustomEvent('printfood:products-updated', { detail: data }));
            return data;
          }
        }
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

  async saveCategory(categoryData: {
    id?: string;
    business_id: string;
    name: string;
    display_order?: number;
    active?: boolean;
  }): Promise<Category> {
    const isEditing = !!categoryData.id;
    const cleanCat: Category = {
      id: categoryData.id || ('cat-' + Date.now()),
      business_id: categoryData.business_id,
      name: categoryData.name.trim(),
      display_order: Number(categoryData.display_order) || 1,
      active: categoryData.active !== undefined ? categoryData.active : true
    };

    const local = this.getLocalCategories();
    const existingIdx = local.findIndex(c => c.id === cleanCat.id);
    let updatedLocal: Category[];
    if (existingIdx >= 0) {
      updatedLocal = [...local];
      updatedLocal[existingIdx] = cleanCat;
    } else {
      updatedLocal = [...local, cleanCat];
    }
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updatedLocal));

    if (!this.isDemoMode && isSupabaseConfigured()) {
      try {
        if (isEditing) {
          const { data, error } = await supabase
            .from('categories')
            .update({
              name: cleanCat.name,
              display_order: cleanCat.display_order,
              active: cleanCat.active
            })
            .eq('id', cleanCat.id)
            .select()
            .single();

          if (!error && data) {
            window.dispatchEvent(new CustomEvent('printfood:categories-updated', { detail: data }));
            return data;
          }
        } else {
          const { data, error } = await supabase
            .from('categories')
            .insert([{
              business_id: cleanCat.business_id,
              name: cleanCat.name,
              display_order: cleanCat.display_order,
              active: cleanCat.active
            }])
            .select()
            .single();

          if (!error && data) {
            window.dispatchEvent(new CustomEvent('printfood:categories-updated', { detail: data }));
            return data;
          }
        }
      } catch (err) {
        console.warn('Fallback to local category saving:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('printfood:categories-updated', { detail: cleanCat }));
    return cleanCat;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const local = this.getLocalCategories();
    const filtered = local.filter(c => c.id !== id);
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(filtered));

    // Desvincular produtos que pertenciam a esta categoria
    const localProds = this.getLocalProducts();
    const updatedProds = localProds.map(p => p.category_id === id ? { ...p, category_id: null } : p);
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updatedProds));

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

  async getTodayOrders(businessId: string): Promise<Order[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      return await getOrdersOffline();
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
      
      if (data) {
        for (const order of data) {
          await saveOrderOffline(order);
        }
      }
      return data || [];
    } catch {
      return await getOrdersOffline();
    }
  },

  async getAllOrders(businessId: string): Promise<Order[]> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    }

    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      return data || [];
    } catch {
      const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    }
  },

  async createOrder(
    orderData: Omit<Order, 'id' | 'created_at' | 'ticket_number'>, 
    items: Omit<OrderItem, 'id' | 'order_id'>[]
  ): Promise<Order | null> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const orders = await getOrdersOffline();
      const nextNumber = String(orders.length + 1).padStart(3, '0');
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
      await saveOrderOffline(newOrder);
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

      // Backup imediato para IndexedDB para proteção contra perda de conexão
      await saveOrderOffline(order);

      const itemsToInsert = items.map(item => ({
        ...item,
        order_id: order.id
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      return order;
    } catch (err) {
      console.warn('Fallback para armazenamento local:', err);
      const localOrders: Order[] = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const nextNumber = String(localOrders.length + 1).padStart(3, '0');
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
      localOrders.unshift(newOrder);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
      window.dispatchEvent(new CustomEvent('printfood:order-created', { detail: newOrder }));
      return newOrder;
    }
  },

  async updateOrderStatus(orderId: string, newStatus: string): Promise<boolean> {
    if (this.isDemoMode || !isSupabaseConfigured()) {
      const localOrders: Order[] = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const updated = localOrders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('printfood:order-updated', { detail: { id: orderId, status: newStatus } }));
      return true;
    }

    try {
      const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId);
      if (error) throw error;
      return true;
    } catch {
      const localOrders: Order[] = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const updated = localOrders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('printfood:order-updated', { detail: { id: orderId, status: newStatus } }));
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
