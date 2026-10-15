export type Currency = 'GS' | 'BRL' | 'USD';

export type UserRole = 'ADMIN' | 'VENDEDOR' | 'DUENO_LOCAL';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  roleDescription: string;
  avatarUrl?: string;
  active: boolean;
}

export interface CurrencyRates {
  BRL_TO_GS: number;
  USD_TO_GS: number;
}

export interface BusinessInfo {
  name: string;
  legalName: string;
  ruc: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  ticketFooterMessage: string;
  logoUrl?: string;
  facebook?: string;
  instagram?: string;
  quoteIntro?: string;
  quoteDefaultValidityDays?: number;
  quoteDefaultPaymentTerms?: string;
  quoteDefaultDeliveryTerms?: string;
  quoteDefaultNotes?: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  productName: string;
  category: string;
  brand?: string;
  imageUrl?: string;
  barcode: string;
  size: string;
  color: string;
  material?: string;
  presentation?: string;
  sku?: string;
  stock: number;
  minStock: number;
  costoGsReal: number;
  precioVentaGs: number;
}

export interface Product {
  id: number;
  baseCode: string;
  name: string;
  category: string;
  brand?: string;
  imageUrl?: string;
  variants: ProductVariant[];
}

export interface Customer {
  id: number;
  name: string;
  documentId?: string; // CI o RUC
  phone?: string;
  email?: string;
  creditLimitGs: number;
  saldoPendienteGs: number;
}

export interface CartItem {
  variant: ProductVariant;
  quantity: number;
  customPriceGs?: number;
}

export interface CompletedSale {
  invoiceNumber: string;
  date: string;
  customer: Customer;
  paymentMode: 'CONTADO' | 'CREDITO_FIADO';
  totalVentaGs: number;
  totalCostoGsReal: number;
  totalRecibidoConvertidoGs: number;
  tenderedGs: number;
  tenderedBrl: number;
  tenderedUsd: number;
  appliedRateBrl: number;
  appliedRateUsd: number;
  vueltoGs: number;
  items: CartItem[];
}

export type QuoteStatus = 'BORRADOR' | 'EMITIDO' | 'ACEPTADO' | 'CANCELADO';

export interface QuoteItem {
  id?: number;
  quoteId?: number;
  productId?: number | null;
  variantId?: number | null;
  code?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface Quote {
  id: number;
  quoteNumber: string;
  status: QuoteStatus;
  date: string;
  validityDays: number;
  dueDate?: string | null;
  currency: Currency;
  exchangeRate: number;
  customerId?: number | null;
  customer?: Customer | null;
  clientName: string;
  clientDocument?: string | null;
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientContact?: string | null;
  introText?: string | null;
  saleCondition: string;
  paymentMethod?: string | null;
  deliveryTime?: string | null;
  notes?: string | null;
  subtotal: number;
  total: number;
  totalInWords?: string | null;
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: QuoteItem[];
  isExpired?: boolean;
}

export type AppModule = 
  | 'dashboard'
  | 'quotes'
  | 'pos'
  | 'products'
  | 'categories'
  | 'purchases'
  | 'customers'
  | 'users'
  | 'audit'
  | 'business'
  | 'daily-sales';
