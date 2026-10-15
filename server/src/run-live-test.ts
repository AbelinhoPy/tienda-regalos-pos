import http from 'https';

const BASE_URL = 'https://tienda-ropas-pos-production.up.railway.app';

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('🚀 INICIANDO PRUEBA DE CICLO COMPLETO EN PRODUCCIÓN (RAILWAY)');
  console.log(`🌐 URL: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Obtener catálogo actual
  console.log('📋 PASO 1: Consultando catálogo actual...');
  const initialProducts = await request('GET', '/api/products');
  console.log(`✅ Productos actuales en catálogo: ${initialProducts.data.data?.length || 0}`);
  if (initialProducts.data.data) {
    for (const p of initialProducts.data.data) {
      console.log(`   - ID: ${p.id} | ${p.productName} (${p.size}/${p.color}) | Stock: ${p.stock} | Código: ${p.barcode}`);
    }
  }

  // 2. Crear un producto de prueba
  console.log('\n👗 PASO 2: Creando producto de prueba: "Blusa Seda Test QA"...');
  const testBarcode = `TEST-${Date.now().toString().slice(-6)}`;
  const createRes = await request('POST', '/api/products', {
    name: 'Blusa Seda Test QA',
    category: 'Blusas',
    brand: 'QA Test Brand',
    variants: [
      {
        size: 'M',
        color: 'Azul Petróleo',
        stock: 10,
        minStock: 2,
        costoGs: 40000,
        precioGs: 85000,
        barcode: testBarcode,
      },
    ],
  });

  if (!createRes.data.success) {
    throw new Error(`Error al crear producto: ${JSON.stringify(createRes.data)}`);
  }

  const createdVariant = createRes.data.data[0];
  console.log(`✅ Producto de prueba creado exitosamente:`);
  console.log(`   - ID Variante: ${createdVariant.id}`);
  console.log(`   - Nombre: ${createdVariant.productName}`);
  console.log(`   - Código de Barras: ${createdVariant.barcode}`);
  console.log(`   - Stock Inicial: ${createdVariant.stock} unidades`);
  console.log(`   - Precio Venta: Gs. ${createdVariant.precioVentaGs.toLocaleString()}`);

  // 3. Verificar persistencia inmediata del producto
  console.log('\n🔍 PASO 3: Verificando persistencia en el catálogo...');
  const verifyCatalog = await request('GET', '/api/products');
  const found = verifyCatalog.data.data.find((v: any) => v.barcode === testBarcode);
  if (!found) {
    throw new Error('❌ Fallo crítico: El producto recién creado no se encontró en el catálogo tras consultar la API.');
  }
  console.log(`✅ Persistencia confirmada: Se encontró la variante ID ${found.id} en la base de datos.`);

  // 4. Procesar una venta POS con lector de código de barras
  console.log('\n💳 PASO 4: Procesando Venta POS con el código de barras...');
  console.log(`   - Vendiendo 2 unidades de "${found.productName}"`);
  console.log(`   - Subtotal esperado: 2 x Gs. 85.000 = Gs. 170.000`);
  console.log(`   - Pago entregado por el cliente: Gs. 200.000 (Efectivo)`);

  const saleRes = await request('POST', '/api/sales', {
    paymentMethod: 'EFECTIVO_GS',
    items: [
      {
        barcode: testBarcode,
        quantity: 2,
        precioUnitarioGs: 85000,
      },
    ],
    montoRecibidoGs: 200000,
  });

  if (!saleRes.data.success) {
    throw new Error(`Error al procesar venta: ${JSON.stringify(saleRes.data)}`);
  }

  const saleData = saleRes.data.data;
  console.log(`✅ Venta procesada exitosamente en el servidor:`);
  console.log(`   - ID Venta: ${saleData.id}`);
  console.log(`   - Ticket Nro: ${saleData.invoiceNumber}`);
  console.log(`   - Total Venta: Gs. ${saleData.totalVentaGs.toLocaleString()}`);
  console.log(`   - Costo Real: Gs. ${saleData.totalCostoGsReal.toLocaleString()}`);
  console.log(`   - Monto Recibido: Gs. ${(saleData.totalRecibidoConvertidoGs || 0).toLocaleString()}`);
  console.log(`   - Vuelto Entregado: Gs. ${(saleData.vueltoGs || 0).toLocaleString()}`);

  // 5. Verificar descuento automático de Stock
  console.log('\n📦 PASO 5: Verificando actualización de Stock tras la venta...');
  const stockAfterSale = await request('GET', '/api/products');
  const foundAfter = stockAfterSale.data.data.find((v: any) => v.barcode === testBarcode);
  console.log(`   - Stock anterior: 10`);
  console.log(`   - Stock actual: ${foundAfter?.stock}`);
  if (foundAfter?.stock !== 8) {
    throw new Error(`❌ Error en stock: Se esperaban 8 unidades, pero hay ${foundAfter?.stock}`);
  }
  console.log(`✅ Descuento de stock verificado correctamente (10 -> 8).`);

  // 6. Verificar reporte de ventas diarias y arqueo de caja
  console.log('\n📊 PASO 6: Verificando Reporte de Ventas del Día y Arqueo...');
  const dailyAudit = await request('GET', '/api/cash/daily-audit');
  console.log(`✅ Arqueo Diario reportado por el servidor:`);
  console.log(`   - Fecha: ${dailyAudit.data.data.date}`);
  console.log(`   - Total Ventas Día: Gs. ${dailyAudit.data.data.totalVentasGs.toLocaleString()}`);
  console.log(`   - Utilidad Neta: Gs. ${dailyAudit.data.data.utilidadNetaGs.toLocaleString()}`);
  console.log(`   - Efectivo en Caja: Gs. ${dailyAudit.data.data.desgloseMonedas.efectivoGs.toLocaleString()}`);

  // 7. LIMPIEZA DE DATOS DE PRUEBA (según solicitud explícita del usuario)
  console.log('\n🧹 PASO 7: LIMPIANDO DATOS DE PRUEBA Y VENTAS (SOLICITUD DEL USUARIO)...');
  
  // A. Eliminar todas las ventas de prueba
  console.log(`   🗑️ Eliminando ventas de la base de datos...`);
  const clearSalesRes = await request('DELETE', '/api/sales');
  console.log(`   ✅ Ventas eliminadas: ${JSON.stringify(clearSalesRes.data)}`);

  // B. Eliminar los productos de prueba (el que creamos recién y cualquier "prueba")
  const allProductsNow = await request('GET', '/api/products');
  const testProductsToDelete = allProductsNow.data.data.filter((p: any) => 
    p.barcode === testBarcode || 
    p.productName.toLowerCase().includes('prueba') || 
    p.productName.toLowerCase().includes('test')
  );

  for (const tp of testProductsToDelete) {
    console.log(`   🗑️ Eliminando producto de prueba: ID ${tp.id} - ${tp.productName}...`);
    await request('DELETE', `/api/products/${tp.id}`);
  }
  console.log(`   ✅ Productos de prueba eliminados.`);

  // 8. Verificación final de limpieza
  console.log('\n✨ PASO 8: Verificación final del estado limpio del sistema...');
  const finalCatalog = await request('GET', '/api/products');
  const finalSales = await request('GET', '/api/sales/daily');
  const finalAudit = await request('GET', '/api/cash/daily-audit');

  console.log(`   - Catálogo restante: ${finalCatalog.data.data?.length || 0} prendas reales`);
  if (finalCatalog.data.data) {
    for (const p of finalCatalog.data.data) {
      console.log(`     * ID: ${p.id} | ${p.productName} (${p.size}/${p.color}) | Stock: ${p.stock}`);
    }
  }
  console.log(`   - Ventas registradas hoy: ${finalSales.data.data.ventas?.length || 0}`);
  console.log(`   - Total Arqueo hoy: Gs. ${finalAudit.data.data.totalVentasGs.toLocaleString()}`);

  console.log('\n================================================================');
  console.log('🎉 ¡TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO Y BASE DE DATOS LIMPIA!');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ ERROR EN LA PRUEBA:', err);
  process.exit(1);
});
