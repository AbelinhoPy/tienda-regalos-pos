import { PrismaClient } from '@prisma/client';

export class DatabaseService {
  /**
   * Limpiar todos los datos de la base de datos (PELIGROSO)
   * Solo para desarrollo o cuando se desea reiniciar completamente el sistema
   */
  public static async clearAllData(): Promise<void> {
    const prisma = new PrismaClient();
    
    try {
      // Eliminar en orden correcto por dependencias
      await prisma.debtPayment.deleteMany();
      await prisma.debt.deleteMany();
      await prisma.saleItem.deleteMany();
      await prisma.sale.deleteMany();
      await prisma.purchaseItem.deleteMany();
      await prisma.purchase.deleteMany();
      await prisma.productVariant.deleteMany();
      await prisma.product.deleteMany();
      await prisma.customer.deleteMany();
      await prisma.currencyRate.deleteMany();
      // @ts-ignore - category model exists in schema
      await prisma.category.deleteMany();
      await prisma.cashShift.deleteMany();
      
      console.log('✅ Base de datos limpiada exitosamente');
    } catch (error) {
      console.error('❌ Error al limpiar la base de datos:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Reiniciar la base de datos con datos iniciales
   */
  public static async resetDatabase(): Promise<void> {
    await this.clearAllData();
    
    // Inicializar categorías por defecto
    const { CategoryService } = await import('./category.service');
    await CategoryService.initializeDefaultCategories();
    
    // Inicializar cotizaciones por defecto
    const { CurrencyService } = await import('./currency.service');
    await CurrencyService.updateDailyRates(1350, 7550);
    
    console.log('✅ Base de datos reiniciada con datos iniciales');
  }
}