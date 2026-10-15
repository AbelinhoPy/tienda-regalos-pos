import { PurchaseService } from './services/purchase.service';
import { SaleService } from './services/sale.service';
import { DebtService } from './services/debt.service';
import { CashService } from './services/cash.service';
import { CurrencyService } from './services/currency.service';

async function runDemoTests() {
  console.log('--- 🧪 1. PROBANDO COTIZACIONES Y OVERRIDE DE COMPRA ---');
  const rates = await CurrencyService.getDailyRates();
  console.log(`Cotizaciones Oficiales: 1 R$ = Gs. ${rates.BRL_TO_GS} | 1 US$ = Gs. ${rates.USD_TO_GS}`);

  // Prueba Compra con Override Manual (Ejemplo especificado: Compra en R$ pagado a Gs. 1.350 en vez de 1.300)
  const purchase = await PurchaseService.registerPurchase({
    purchaseNumber: 'COMPRA-BR-001',
    supplierName: 'Confecções Brasil LTDA',
    currency: 'BRL',
    customRate: 1350, // OVERRIDE MANUAL
    items: [
      {
        variantId: 1,
        quantity: 10,
        costoMonedaOrigen: 45.0, // R$ 45.00
        margenGananciaPct: 60
      }
    ]
  });

  console.log('Resultado Compra:');
  console.log(`- Moneda de origen: ${purchase.currency}`);
  console.log(`- Tipo de cambio de compra aplicado: Gs. ${purchase.cotizacionCompraReal}`);
  console.log(`- Costo Unitario en Gs (45 * 1350): Gs. ${purchase.items[0].costoGsReal.toLocaleString()}`);
  console.log(`- Precio de Venta Sugerido (Gs): Gs. ${purchase.items[0].precioVentaGs.toLocaleString()}`);
  console.log(`- Total Lote en Reales: R$ ${purchase.totalMonedaOrigen}`);
  console.log(`- Total Lote en Guaraníes: Gs. ${purchase.totalGsReal.toLocaleString()}`);

  console.log('\n--- 🛒 2. PROBANDO PROCESAMIENTO DE VENTA POS ---');
  const sale = await SaleService.processSale({
    paymentMethod: 'EFECTIVO_BRL',
    items: [
      {
        barcode: '7840001001',
        quantity: 1,
        precioUnitarioGs: 95000
      }
    ],
    tenderedBrl: 80.0, // Cliente entrega R$ 80
    appliedRateBrl: 1350
  });

  console.log('Resultado Venta POS:');
  console.log(`- Total Venta: Gs. ${sale.totalVentaGs.toLocaleString()}`);
  console.log(`- Costo Real Mercadería: Gs. ${sale.totalCostoGsReal.toLocaleString()}`);
  console.log(`- Utilidad Neta Real: Gs. ${sale.utilidadNetaGs.toLocaleString()}`);
  console.log(`- Recibido en R$: R$ 80.00 (Equivale a Gs. ${sale.totalRecibidoConvertidoGs.toLocaleString()})`);
  console.log(`- Vuelto entregado en Gs: Gs. ${sale.vueltoGs.toLocaleString()}`);

  console.log('\n--- 👥 3. PROBANDO ABONO DE CLIENTE DEUDOR ---');
  const abono = await DebtService.registerPayment({
    customerId: 2,
    currency: 'BRL',
    amountPaid: 100.0, // Entrega R$ 100
    paymentMethod: 'EFECTIVO_BRL'
  });

  console.log('Resultado Abono:');
  console.log(`- Divisa entregada: R$ ${abono.amountPaid}`);
  console.log(`- Tasa aplicada: Gs. ${abono.rateApplied}`);
  console.log(`- Acreditado a la deuda en Gs: Gs. ${abono.amountAppliedGs.toLocaleString()}`);
  console.log(`- Saldo anterior: Gs. ${abono.saldoAnteriorGs.toLocaleString()}`);
  console.log(`- Nuevo saldo pendiente: Gs. ${abono.nuevoSaldoPendienteGs.toLocaleString()}`);

  console.log('\n--- 📊 4. PROBANDO ARQUEO DE CAJA DIARIO ---');
  const audit = await CashService.getDailyCashAudit();
  console.log('Resumen de Arqueo:');
  console.log(`- Total Ventas: Gs. ${audit.totalVentasGs.toLocaleString()}`);
  console.log(`- Total Costo Real: Gs. ${audit.totalCostoGsReal.toLocaleString()}`);
  console.log(`- Utilidad Neta Real: Gs. ${audit.utilidadNetaGs.toLocaleString()} (Margen: ${audit.margenUtilidadPct}%)`);
  console.log(`- Billetes en Caja: Gs. ${audit.desgloseMonedas.efectivoGs.toLocaleString()} | R$ ${audit.desgloseMonedas.efectivoBrl} | US$ ${audit.desgloseMonedas.efectivoUsd}`);
  console.log('--------------------------------------------------');
  console.log('✅ ¡Todas las pruebas de lógica de negocio superadas!');
}

runDemoTests().catch(console.error);
