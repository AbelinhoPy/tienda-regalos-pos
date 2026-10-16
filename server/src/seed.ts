import { prisma } from './prisma';
import { CategoryService } from './services/category.service';
import { CurrencyService } from './services/currency.service';
import { ProductService } from './services/product.service';
import { QuoteService } from './services/quote.service';

async function main() {
  console.log('🌱 Inicializando datos base para Tienda de Regalos & Personalizados...');

  // 1. Categorías por defecto
  await CategoryService.initializeDefaultCategories(prisma);

  // 2. Cotizaciones oficiales (Frontera Paraguay: R$ 1.350 / US$ 7.550)
  await CurrencyService.updateDailyRates(1350, 7550);

  // 3. Cliente Demo (Referencia del presupuesto)
  const existingCustomer = await prisma.customer.findFirst({
    where: { name: 'DOMO SMART S.A.' }
  });

  let customer = existingCustomer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'DOMO SMART S.A.',
        documentId: '80100254-0',
        phone: '+595 993 346 854',
        email: 'contacto@domosmart.com.py',
        creditLimitGs: 5000000,
        saldoPendienteGs: 0
      }
    });
    console.log('✅ Cliente demo creado: DOMO SMART S.A.');
  }

  // 4. Productos de demostración de papelería y personalizados (del PDF de ejemplo)
  const count = await prisma.product.count();
  if (count === 0) {
    // Volantes 200 y 400 uds
    await ProductService.createProduct({
      name: 'Volante 10,5 x 14,8 cm - Ambas Caras',
      category: 'Volantes, Folletos & Tarjetería',
      brand: 'Imprenta Creativa',
      variants: [
        {
          size: '10,5 x 14,8 cm (200 uds)',
          color: 'Full Color',
          presentation: '200 unidades',
          stock: 50,
          costoGs: 300000,
          precioGs: 500000
        },
        {
          size: '10,5 x 14,8 cm (400 uds)',
          color: 'Full Color',
          presentation: '400 unidades',
          stock: 50,
          costoGs: 450000,
          precioGs: 700000
        }
      ]
    });

    await ProductService.createProduct({
      name: 'Volante 10,5 x 14,8 cm - Una Cara',
      category: 'Volantes, Folletos & Tarjetería',
      brand: 'Imprenta Creativa',
      variants: [
        {
          size: '10,5 x 14,8 cm (200 uds)',
          color: 'Full Color',
          presentation: '200 unidades',
          stock: 50,
          costoGs: 200000,
          precioGs: 360000
        },
        {
          size: '10,5 x 14,8 cm (400 uds)',
          color: 'Full Color',
          presentation: '400 unidades',
          stock: 50,
          costoGs: 320000,
          precioGs: 540000
        }
      ]
    });

    // Otros productos de regalos personalizados
    await ProductService.createProduct({
      name: 'Taza Mágica Personalizada',
      category: 'Tazas & Vasos Personalizados',
      brand: 'Florecer',
      variants: [
        {
          size: '325 ml',
          color: 'Negro a Blanco',
          material: 'Cerámica termosensible',
          presentation: 'En caja individual',
          stock: 25,
          costoGs: 25000,
          precioGs: 45000
        }
      ]
    });

    await ProductService.createProduct({
      name: 'Termo Stanley 1.2L Grabado Láser',
      category: 'Termos & Choperas Grabadas',
      brand: 'Stanley Original',
      variants: [
        {
          size: '1.2 Litros',
          color: 'Negro Mate',
          material: 'Acero Inoxidable',
          presentation: 'Grabado personalizado',
          stock: 10,
          costoGs: 220000,
          precioGs: 350000
        }
      ]
    });

    console.log('✅ Productos demo de regalos y papelería creados.');
  }

  // 5. Crear presupuesto demo idéntico al PDF de referencia si no existe
  const quoteCount = await prisma.quote.count();
  if (quoteCount === 0 && customer) {
    await QuoteService.createQuote({
      customerId: customer.id,
      clientName: customer.name,
      clientDocument: customer.documentId || '80100254 - 0',
      clientPhone: customer.phone || '',
      validityDays: 8,
      currency: 'GS',
      saleCondition: 'CONTADO',
      paymentMethod: '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE',
      deliveryTime: '3 DÍAS HÁBILES',
      status: 'EMITIDO',
      items: [
        {
          code: '',
          description: 'VOLANTE EN LA MEDIDA 10,5 CM X 14,8 CM, IMPRESIÓN AMBAS CARAS 200 UNIDADES',
          quantity: 1,
          unitPrice: 500000
        },
        {
          code: '',
          description: 'VOLANTE EN LA MEDIDA 10,5 CM X 14,8 CM, IMPRESIÓN AMBAS CARAS 400 UNIDADES',
          quantity: 1,
          unitPrice: 700000
        },
        {
          code: '',
          description: 'VOLANTE EN LA MEDIDA 10,5 CM X 14,8 CM, IMPRESIÓN A UNA CARA 200 UNIDADES',
          quantity: 1,
          unitPrice: 360000
        },
        {
          code: '',
          description: 'VOLANTE EN LA MEDIDA 10,5 CM X 14,8 CM, IMPRESIÓN A UNA CARA 400 UNIDADES',
          quantity: 1,
          unitPrice: 540000
        }
      ]
    });
    console.log('✅ Presupuesto demo inicial creado (Total: ₲ 2.100.000).');
  }

  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
