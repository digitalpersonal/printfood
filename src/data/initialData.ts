import { Business, Category, Product, Attendant, PrinterConfig } from '../types';

export const DEFAULT_BUSINESS: Business = {
  id: 'printfood-main-001',
  name: 'Meu Estabelecimento',
  document: '',
  phone: '',
  created_at: new Date().toISOString()
};

export const DEFAULT_CATEGORIES: Category[] = [];

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_ADMIN = {
  email: 'digitalpersonal@gmail.com',
  name: 'Administrador Geral',
  role: 'admin_geral' as const
};

export const MASTER_ADMIN_CREDENTIALS = {
  email: 'digitalpersonal@gmail.com',
  password: 'Mld3602#?+'
};

export const DEFAULT_ATTENDANTS: Attendant[] = [];

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printerType: 'browser',
  paperWidth: '80mm',
  targetMode: 'local',
  stationName: 'Terminal Caixa 01',
  autoPrintOnOrder: true,
  printCopies: 1,
  separateVouchersByItem: false,
  networkPrinterIp: '192.168.1.200',
  networkPrinterPort: 9100,
  headerCustomText: 'BEM-VINDO AO EVENTO',
  footerCustomText: 'OBRIGADO PELA PREFERÊNCIA!',
  directPrinting: false,
  autoCleanupHours: 0
};

export const SQL_SCHEMA_SCRIPT = `-- Configuração do Schema do PrintFood no Supabase

-- 1. Criação das Tabelas
CREATE TABLE IF NOT EXISTS business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'pago',
  customer_name TEXT,
  attendant_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL
);

-- Atendentes e Caixas com E-mail e Senha de Acesso
CREATE TABLE IF NOT EXISTS attendants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT '',
  code TEXT DEFAULT '01',
  role TEXT DEFAULT 'atendente',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fila de Impressão Remota (Celular -> PC)
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  order_id TEXT,
  ticket_number TEXT NOT NULL,
  source_device TEXT NOT NULL,
  attendant_name TEXT,
  customer_name TEXT,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Configurar Row Level Security (RLS)
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendants ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso Público
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a business') THEN
    CREATE POLICY "Permitir acesso público a business" ON business FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a categories') THEN
    CREATE POLICY "Permitir acesso público a categories" ON categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a products') THEN
    CREATE POLICY "Permitir acesso público a products" ON products FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a orders') THEN
    CREATE POLICY "Permitir acesso público a orders" ON orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a order_items') THEN
    CREATE POLICY "Permitir acesso público a order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a attendants') THEN
    CREATE POLICY "Permitir acesso público a attendants" ON attendants FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso público a print_jobs') THEN
    CREATE POLICY "Permitir acesso público a print_jobs" ON print_jobs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Habilitar Replicação em Tempo Real para fila de impressão (Realtime)
ALTER TABLE print_jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- Adiciona a tabela à publicação para que os canais realtime funcionem
  ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora erro caso a tabela já pertença à publicação
    NULL;
END $$;

NOTIFY pgrst, 'reload schema';
`;
