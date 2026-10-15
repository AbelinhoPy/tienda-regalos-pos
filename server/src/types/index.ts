export type Currency = 'GS' | 'BRL' | 'USD';

export type PaymentMethod = 
  | 'EFECTIVO_GS'
  | 'EFECTIVO_BRL'
  | 'EFECTIVO_USD'
  | 'TARJETA'
  | 'TRANSFERENCIA'
  | 'CREDITO_FIADO';

export interface CurrencyRates {
  BRL_TO_GS: number;
  USD_TO_GS: number;
  updatedAt: Date;
}

export interface PurchaseItemInput {
  variantId?: number;
  barcode?: string;
  productName?: string;
  category?: string;
  size?: string;
  color?: string;
  quantity: number;
  costoMonedaOrigen: number;
  margenGananciaPct: number; // Porcentaje ej: 60 = 60%
}

export interface RegisterPurchaseInput {
  purchaseNumber: string;
  supplierName?: string;
  currency: Currency;
  customRate?: number; // Override manual de cotización
  items: PurchaseItemInput[];
  notes?: string;
}

export interface SaleItemInput {
  barcode?: string;
  variantId?: number;
  quantity: number;
  precioUnitarioGs?: number; // Opcional, toma el precio de lista si no se especifica
}

export interface ProcessSaleInput {
  invoiceNumber?: string;
  customerId?: number;
  paymentMethod: PaymentMethod;
  items: SaleItemInput[];
  // Pagos multimoneda recibidos en caja
  // Acepta tanto tenderedGs (nombre interno) como montoRecibidoGs (nombre del frontend)
  tenderedGs?: number;
  tenderedBrl?: number;
  tenderedUsd?: number;
  montoRecibidoGs?: number;
  montoRecibidoBrl?: number;
  montoRecibidoUsd?: number;
  // Cotizaciones aplicadas en la transacción
  appliedRateBrl?: number;
  appliedRateUsd?: number;
  cotizacionBrl?: number;
  cotizacionUsd?: number;
}

export interface DebtPaymentInput {
  customerId: number;
  debtId?: number;
  currency: Currency;
  amountPaid: number;
  customRate?: number; // Si se omite, usa la cotización del día
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface DailyCashAuditFilter {
  date?: string; // YYYY-MM-DD
  cashierName?: string;
}

export interface DailyCashAuditResult {
  date: string;
  totalVentasGs: number;
  totalCostoGsReal: number;
  utilidadNetaGs: number;
  margenUtilidadPct: number;
  desgloseMonedas: {
    efectivoGs: number;
    efectivoBrl: number;
    efectivoUsd: number;
    totalEfectivoConvertidoGs: number;
  };
  desgloseMetodosGs: {
    efectivoTotalGs: number;
    tarjetaGs: number;
    transferenciaGs: number;
    creditoFiadoGs: number;
  };
  ventasPorCobrarCount: number;
  totalCreditosEmitidosGs: number;
  totalAbonosCobradosGs: number;
}
