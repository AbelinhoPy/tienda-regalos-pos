const fs = require('fs');
const path = require('path');
const { PdfService } = require('./dist/services/pdf.service');
const { numeroALetras } = require('./dist/utils/numberToWords');

async function runTests() {
  console.log('=== TEST 1: PPTO DOMO SMART BENCHMARK (1 PÁGINA) ===');

  const items = [
    {
      code: 'VOL-1015',
      description: '1.000 Volantes Publicitarios 10x15cm Full Color Frente y Dorso Couché 150g',
      quantity: 1,
      unitPrice: 500000,
      total: 500000,
    },
    {
      code: 'VOL-1521',
      description: '1.000 Volantes Publicitarios 15x21cm Full Color Frente y Dorso Couché 150g',
      quantity: 1,
      unitPrice: 700000,
      total: 700000,
    },
    {
      code: 'CARP-CORP',
      description: '200 Carpetas Corporativas con Bolsillo Troquelado y Porta Tarjeta',
      quantity: 1,
      unitPrice: 360000,
      total: 360000,
    },
    {
      code: 'HOJ-A4',
      description: '300 Hojas Membretadas A4 90grs Impresión Offset Full Color',
      quantity: 1,
      unitPrice: 540000,
      total: 540000,
    },
  ];

  const totalCalculado = items.reduce((acc, it) => acc + it.total, 0);
  const totalEnLetras = numeroALetras(totalCalculado);

  console.log(`Total calculado: ₲ ${totalCalculado.toLocaleString('es-PY')}`);
  console.log(`Total en letras: "${totalEnLetras}"`);

  if (totalCalculado !== 2100000) {
    throw new Error(`Total esperado 2.100.000, pero dio ${totalCalculado}`);
  }
  if (!totalEnLetras.includes('DOS MILLONES CIEN MIL')) {
    throw new Error(`Letras esperadas 'DOS MILLONES CIEN MIL', pero dio '${totalEnLetras}'`);
  }

  const benchmarkData = {
    quoteNumber: 'PPTO-000123',
    date: '2026-10-13',
    validityDays: 15,
    currency: 'GS',
    clientName: 'DOMO SMART S.A.',
    clientDocument: '80123456-7',
    clientAddress: 'Av. Monseñor Rodríguez c/ Nanawa, Ciudad del Este',
    clientPhone: '+595 983 123 456',
    clientContact: 'Ing. Carlos Mendoza',
    introText: 'Por medio de la presente ponemos a su consideración la cotización de los trabajos solicitados:',
    saleCondition: 'Contado 50% anticipo, saldo contra entrega',
    paymentMethod: 'Transferencia Bancaria / Cheque / Efectivo',
    deliveryTime: '5 días hábiles a partir de la aprobación final del diseño',
    notes: 'Los precios incluyen IVA (10%). Precios válidos según tiempo estipulado.',
    total: totalCalculado,
    totalInWords: totalEnLetras,
    createdByName: 'Abel Núñez',
    items,
  };

  const businessConfig = {
    name: 'REGALOS & PUBLICIDAD',
    legalName: 'REGALOS & PERSONALIZADOS S.R.L.',
    ruc: '80098765-4',
    phone: '0993 277 410',
    email: 'ventas@regalosypersonalizados.com.py',
    address: 'Av. San Blas Km 3.5, Ciudad del Este',
    city: 'Ciudad del Este, Paraguay',
    facebook: 'regalosypersonalizadospy',
    instagram: '@regalosypersonalizadospy',
  };

  const pdfBuffer1 = await PdfService.generateQuotePdf(benchmarkData, businessConfig);
  const outPath1 = path.join(__dirname, 'Presupuesto_000123_DOMO_SMART_SA.pdf');
  fs.writeFileSync(outPath1, pdfBuffer1);
  console.log(`✓ Archivo 1 generado con éxito: ${outPath1} (${pdfBuffer1.length} bytes)`);

  console.log('\n=== TEST 2: MULTI-PÁGINA (16 ÍTEMS) ===');
  const multiItems = [];
  for (let i = 1; i <= 16; i++) {
    const qty = i * 2;
    const price = 50000 + i * 15000;
    multiItems.push({
      code: `PROD-${String(i).padStart(3, '0')}`,
      description: `Producto Personalizado #${i}: Taza de Cerámica Sublimada con Logo full color + caja individual`,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
    });
  }

  const multiTotal = multiItems.reduce((acc, it) => acc + it.total, 0);
  const multiLetras = numeroALetras(multiTotal);

  const multiData = {
    quoteNumber: 'PPTO-000124',
    date: '2026-10-13',
    validityDays: 30,
    currency: 'GS',
    clientName: 'COOPERATIVA UNIVERSITARIA LTDA.',
    clientDocument: '80004567-1',
    clientAddress: 'Av. San Martín c/ España, Asunción',
    clientPhone: '021 617 0000',
    clientContact: 'Lic. María Fernández',
    introText: 'Presentamos la propuesta comercial para los kits de regalos y merchandising de fin de año:',
    saleCondition: 'Crédito a 30 días',
    paymentMethod: 'Transferencia Bancaria SIPAP',
    deliveryTime: '10 días hábiles',
    notes: 'Garantía de calidad en estampados y acabados.',
    total: multiTotal,
    totalInWords: multiLetras,
    createdByName: 'Abel Núñez',
    items: multiItems,
  };

  const pdfBuffer2 = await PdfService.generateQuotePdf(multiData, businessConfig);
  const outPath2 = path.join(__dirname, 'Presupuesto_000124_MULTIPAGE.pdf');
  fs.writeFileSync(outPath2, pdfBuffer2);
  console.log(`✓ Archivo 2 generado con éxito: ${outPath2} (${pdfBuffer2.length} bytes)`);

  console.log('\n=== TODOS LOS TESTS DEL GENERADOR DE PDF HAN PASADO CON ÉXITO ===');
}

runTests().catch((err) => {
  console.error('Error en pruebas de PDF:', err);
  process.exit(1);
});
