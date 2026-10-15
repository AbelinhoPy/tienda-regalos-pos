import { prisma } from './prisma';

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true }
  });
  console.log('=== PRODUCTOS EN BASE DE DATOS ===');
  for (const p of products) {
    console.log(`ID: ${p.id} | ${p.name} | Categoria: ${p.categoryName}`);
    for (const v of p.variants) {
      console.log(`   -> Variante ID: ${v.id} | Codigo: ${v.barcode} | Talle: ${v.size} | Color: ${v.color} | Stock: ${v.stock} | Precio: Gs. ${v.precioVentaGs}`);
    }
  }

  const sales = await prisma.sale.findMany({
    include: { items: true }
  });
  console.log('\n=== VENTAS EN BASE DE DATOS ===');
  for (const s of sales) {
    console.log(`Venta ID: ${s.id} | Factura: ${s.invoiceNumber} | Metodo: ${s.paymentMethod} | Total: Gs. ${s.totalVentaGs} | Items: ${s.items.length}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
