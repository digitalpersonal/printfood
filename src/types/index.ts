export type PaymentMethod = 'pix' | 'dinheiro' | 'debito' | 'credito' | 'voucher' | 'outro';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type OrderStatus = 'pago' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';

export interface Business {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  display_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  display_order: number;
}

export interface Order {
  id: string;
  business_id: string;
  ticket_number: string;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  customer_name: string | null;
  attendant_name?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type UserRole = 'admin_geral' | 'caixa' | 'atendente';

export interface Attendant {
  id: string;
  business_id: string;
  name: string;
  email: string;
  password?: string;
  code?: string;
  role: 'caixa' | 'atendente';
  active: boolean;
  created_at?: string;
}

export type PrintTargetMode = 'local' | 'mobile_send_to_pc' | 'pc_spooler_server';
export type PrinterPaperWidth = '58mm' | '80mm' | 'a4';
export type PrinterType = 'browser' | 'network' | 'bluetooth' | 'escpos_usb';

export interface PrinterConfig {
  printerType: PrinterType;
  paperWidth: PrinterPaperWidth;
  targetMode: PrintTargetMode;
  stationName: string; // ex: "Caixa Principal PC", "Celular Atendente 1"
  autoPrintOnOrder: boolean;
  printCopies: number; // 1 ou 2
  separateVouchersByItem: boolean; // Imprimir 1 ficha para cada item ou ficha única com resumo
  networkPrinterIp?: string;
  networkPrinterPort?: number;
  headerCustomText?: string;
  footerCustomText?: string;
  directPrinting: boolean;
  useCompactTemplate?: boolean;
  usbPrinterVendorId?: number;
  usbPrinterProductId?: number;
  categoryMappings?: Record<string, { vendorId: number; productId: number; deviceName: string }>;
}

export interface PrintJob {
  id: string;
  business_id: string;
  order_id: string;
  ticket_number: string;
  source_device: string;
  attendant_name?: string;
  customer_name?: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  total: number;
  payment_method: string;
  status: 'pending' | 'printed' | 'failed';
  created_at: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: UserRole;
  authenticated_at?: string;
}

export interface SystemUser {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  business_id?: string;
  authenticated_at?: string;
}
