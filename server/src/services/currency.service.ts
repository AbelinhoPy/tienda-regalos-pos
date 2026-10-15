import { Currency, CurrencyRates } from '../types';

export class CurrencyService {
  // Cotizaciones por defecto (Paraguay frontera) - solo como fallback
  private static defaultRates: CurrencyRates = {
    BRL_TO_GS: 1350.0, // 1 Real = 1.350 Gs.
    USD_TO_GS: 7550.0, // 1 Dólar = 7.550 Gs.
    updatedAt: new Date()
  };

  /**
   * Obtiene la cotización de referencia para el día desde la base de datos
   */
  public static async getDailyRates(dbClient?: any): Promise<CurrencyRates> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = dbClient || new PrismaClient();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Buscar cotizaciones de hoy
      const brlRate = await prisma.currencyRate.findFirst({
        where: {
          currency: 'BRL',
          officialDate: {
            gte: today
          }
        },
        orderBy: {
          officialDate: 'desc'
        }
      });
      
      const usdRate = await prisma.currencyRate.findFirst({
        where: {
          currency: 'USD',
          officialDate: {
            gte: today
          }
        },
        orderBy: {
          officialDate: 'desc'
        }
      });
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
      
      // Si no hay cotizaciones hoy, usar las más recientes o default
      const brlToGs = brlRate?.rateToGs || this.defaultRates.BRL_TO_GS;
      const usdToGs = usdRate?.rateToGs || this.defaultRates.USD_TO_GS;
      
      return {
        BRL_TO_GS: brlToGs,
        USD_TO_GS: usdToGs,
        updatedAt: brlRate?.officialDate || usdRate?.officialDate || new Date()
      };
    } catch (error) {
      console.error('Error fetching currency rates from database:', error);
      return this.defaultRates;
    }
  }

  /**
   * Actualiza las cotizaciones oficiales del día en la base de datos
   */
  public static async updateDailyRates(brlToGs: number, usdToGs: number, dbClient?: any): Promise<CurrencyRates> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = dbClient || new PrismaClient();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Actualizar o crear cotización BRL
      await prisma.currencyRate.upsert({
        where: { id: 1 }, // Usar un ID fijo para simplicidad
        update: {
          currency: 'BRL',
          rateToGs: brlToGs,
          officialDate: today
        },
        create: {
          currency: 'BRL',
          rateToGs: brlToGs,
          officialDate: today
        }
      });
      
      // Actualizar o crear cotización USD
      await prisma.currencyRate.upsert({
        where: { id: 2 }, // Usar un ID fijo para simplicidad
        update: {
          currency: 'USD',
          rateToGs: usdToGs,
          officialDate: today
        },
        create: {
          currency: 'USD',
          rateToGs: usdToGs,
          officialDate: today
        }
      });
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
      
      const rates = {
        BRL_TO_GS: brlToGs,
        USD_TO_GS: usdToGs,
        updatedAt: today
      };
      
      // Actualizar default rates también
      this.defaultRates = rates;
      
      return rates;
    } catch (error) {
      console.error('Error updating currency rates in database:', error);
      // Fallback a memoria si falla la base de datos
      this.defaultRates = {
        BRL_TO_GS: brlToGs,
        USD_TO_GS: usdToGs,
        updatedAt: new Date()
      };
      return this.defaultRates;
    }
  }

  /**
   * Convierte un monto en cualquier moneda a Moneda Base (Guaraníes)
   * Permite un tipo de cambio personalizado (Override manual de compra o cobro)
   */
  public static async convertToGs(amount: number, currency: Currency, customRate?: number): Promise<{ amountGs: number; rateUsed: number }> {
    if (currency === 'GS') {
      return { amountGs: Math.round(amount), rateUsed: 1.0 };
    }

    if (customRate && customRate > 0) {
      return { 
        amountGs: Math.round(amount * customRate), 
        rateUsed: customRate 
      };
    }

    const rates = await this.getDailyRates();
    const rate = currency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS;
    return {
      amountGs: Math.round(amount * rate),
      rateUsed: rate
    };
  }

  /**
   * Convierte desde Guaraníes a una divisa secundaria
   */
  public static async convertFromGs(amountGs: number, targetCurrency: Currency, rate?: number): Promise<number> {
    if (targetCurrency === 'GS') return amountGs;
    
    if (rate && rate > 0) {
      return Number((amountGs / rate).toFixed(2));
    }
    
    const rates = await this.getDailyRates();
    const effectiveRate = targetCurrency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS;
    return Number((amountGs / effectiveRate).toFixed(2));
  }
}
