import { prisma } from '../prisma';
import { numeroALetras } from '../utils/numberToWords';

export interface CreateQuoteItemInput {
  productId?: number;
  variantId?: number;
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  sortOrder?: number;
}

export interface CreateQuoteInput {
  customerId?: number;
  clientName: string;
  clientDocument?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientContact?: string;
  
  date?: string | Date;
  validityDays?: number;
  currency?: string;
  exchangeRate?: number;
  
  introText?: string;
  saleCondition?: string;
  paymentMethod?: string;
  deliveryTime?: string;
  notes?: string;
  createdByName?: string;
  
  items: CreateQuoteItemInput[];
  status?: 'BORRADOR' | 'EMITIDO' | 'ACEPTADO' | 'CANCELADO';
}

export interface UpdateQuoteInput extends Partial<CreateQuoteInput> {}

export class QuoteService {
  /**
   * Genera el siguiente número de presupuesto seguro y secuencial (ej. PPTO-000001)
   */
  public static async generateNextQuoteNumber(): Promise<string> {
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true, quoteNumber: true }
    });

    if (!lastQuote) {
      return 'PPTO-000001';
    }

    // Intentar extraer el número del formato PPTO-XXXXXX
    const match = lastQuote.quoteNumber.match(/\d+/);
    let nextNum = lastQuote.id + 1;
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }

    const padded = nextNum.toString().padStart(6, '0');
    return `PPTO-${padded}`;
  }

  /**
   * Listar presupuestos con búsqueda y filtro de estado
   */
  public static async listQuotes(params: {
    search?: string;
    status?: string;
  }) {
    const where: any = {};

    if (params.status && params.status !== 'TODOS') {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { quoteNumber: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { clientDocument: { contains: q, mode: 'insensitive' } },
        { clientContact: { contains: q, mode: 'insensitive' } },
      ];
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        customer: true
      },
      orderBy: { id: 'desc' }
    });

    const now = new Date();
    return quotes.map((q) => {
      const isExpired = q.dueDate ? new Date(q.dueDate) < now && q.status === 'EMITIDO' : false;
      return {
        ...q,
        isExpired
      };
    });
  }

  /**
   * Obtener detalle de un presupuesto por ID
   */
  public static async getQuoteById(id: number) {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        customer: true
      }
    });

    if (!quote) {
      throw new Error(`Presupuesto con ID ${id} no encontrado.`);
    }

    const now = new Date();
    const isExpired = quote.dueDate ? new Date(quote.dueDate) < now && quote.status === 'EMITIDO' : false;

    return {
      ...quote,
      isExpired
    };
  }

  /**
   * Crear un nuevo presupuesto
   */
  public static async createQuote(input: CreateQuoteInput) {
    if (!input.clientName || !input.clientName.trim()) {
      throw new Error('El nombre o razón social del cliente es obligatorio.');
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('Debe agregar al menos un ítem al presupuesto.');
    }

    const currency = (input.currency || 'GS').toUpperCase();
    const validityDays = input.validityDays !== undefined ? Math.max(1, Number(input.validityDays)) : 8;
    const date = input.date ? new Date(input.date) : new Date();
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + validityDays);

    // Validar y recalcular ítems en el backend
    let subtotal = 0;
    const sanitizedItems = input.items.map((item, index) => {
      const quantity = Math.max(0.01, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      
      // Manejo exacto según moneda (enteros para GS, 2 decimales para USD/BRL)
      const totalItem = currency === 'GS'
        ? Math.round(quantity * unitPrice)
        : Math.round(quantity * unitPrice * 100) / 100;

      subtotal += totalItem;

      return {
        productId: item.productId || null,
        variantId: item.variantId || null,
        code: item.code?.trim() || null,
        description: item.description?.trim() || 'Ítem sin descripción',
        quantity,
        unitPrice,
        total: totalItem,
        imageUrl: item.imageUrl?.trim() || null,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : index
      };
    });

    const total = currency === 'GS' ? Math.round(subtotal) : Math.round(subtotal * 100) / 100;
    const totalInWords = numeroALetras(total, currency, false);
    const quoteNumber = await this.generateNextQuoteNumber();

    return prisma.$transaction(async (tx) => {
      return tx.quote.create({
        data: {
          quoteNumber,
          status: input.status || 'EMITIDO',
          date,
          validityDays,
          dueDate,
          currency,
          exchangeRate: Number(input.exchangeRate) || 1.0,
          customerId: input.customerId || null,
          clientName: input.clientName.trim(),
          clientDocument: input.clientDocument?.trim() || null,
          clientAddress: input.clientAddress?.trim() || null,
          clientPhone: input.clientPhone?.trim() || null,
          clientContact: input.clientContact?.trim() || null,
          introText: input.introText?.trim() || 'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado',
          saleCondition: input.saleCondition?.trim() || 'CONTADO',
          paymentMethod: input.paymentMethod?.trim() || '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE',
          deliveryTime: input.deliveryTime?.trim() || '3 DÍAS HÁBILES',
          notes: input.notes?.trim() || null,
          createdByName: input.createdByName?.trim() || 'Dpto Comercial',
          subtotal,
          total,
          totalInWords,
          items: {
            create: sanitizedItems
          }
        },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          customer: true
        }
      });
    });
  }

  /**
   * Actualizar un presupuesto existente
   */
  public static async updateQuote(id: number, input: UpdateQuoteInput) {
    const existing = await prisma.quote.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      throw new Error(`Presupuesto con ID ${id} no encontrado.`);
    }

    const currency = (input.currency || existing.currency).toUpperCase();
    const validityDays = input.validityDays !== undefined ? Math.max(1, Number(input.validityDays)) : existing.validityDays;
    const date = input.date ? new Date(input.date) : existing.date;
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + validityDays);

    let sanitizedItems = undefined;
    let subtotal = existing.subtotal;
    let total = existing.total;
    let totalInWords = existing.totalInWords;

    if (input.items && input.items.length > 0) {
      let calcSubtotal = 0;
      sanitizedItems = input.items.map((item, index) => {
        const quantity = Math.max(0.01, Number(item.quantity) || 1);
        const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
        const totalItem = currency === 'GS'
          ? Math.round(quantity * unitPrice)
          : Math.round(quantity * unitPrice * 100) / 100;

        calcSubtotal += totalItem;

        return {
          productId: item.productId || null,
          variantId: item.variantId || null,
          code: item.code?.trim() || null,
          description: item.description?.trim() || 'Ítem sin descripción',
          quantity,
          unitPrice,
          total: totalItem,
          imageUrl: item.imageUrl?.trim() || null,
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : index
        };
      });

      subtotal = calcSubtotal;
      total = currency === 'GS' ? Math.round(subtotal) : Math.round(subtotal * 100) / 100;
      totalInWords = numeroALetras(total, currency, false);
    }

    return prisma.$transaction(async (tx) => {
      if (sanitizedItems) {
        // Eliminar ítems anteriores y reemplazar
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      }

      return tx.quote.update({
        where: { id },
        data: {
          status: input.status !== undefined ? input.status : existing.status,
          date,
          validityDays,
          dueDate,
          currency,
          exchangeRate: input.exchangeRate !== undefined ? Number(input.exchangeRate) : existing.exchangeRate,
          customerId: input.customerId !== undefined ? input.customerId : existing.customerId,
          clientName: input.clientName !== undefined ? input.clientName.trim() : existing.clientName,
          clientDocument: input.clientDocument !== undefined ? input.clientDocument?.trim() || null : existing.clientDocument,
          clientAddress: input.clientAddress !== undefined ? input.clientAddress?.trim() || null : existing.clientAddress,
          clientPhone: input.clientPhone !== undefined ? input.clientPhone?.trim() || null : existing.clientPhone,
          clientContact: input.clientContact !== undefined ? input.clientContact?.trim() || null : existing.clientContact,
          introText: input.introText !== undefined ? input.introText?.trim() || null : existing.introText,
          saleCondition: input.saleCondition !== undefined ? input.saleCondition?.trim() || 'CONTADO' : existing.saleCondition,
          paymentMethod: input.paymentMethod !== undefined ? input.paymentMethod?.trim() || null : existing.paymentMethod,
          deliveryTime: input.deliveryTime !== undefined ? input.deliveryTime?.trim() || null : existing.deliveryTime,
          notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
          createdByName: input.createdByName !== undefined ? input.createdByName?.trim() || null : existing.createdByName,
          subtotal,
          total,
          totalInWords,
          ...(sanitizedItems ? { items: { create: sanitizedItems } } : {})
        },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          customer: true
        }
      });
    });
  }

  /**
   * Cambiar estado de un presupuesto
   */
  public static async updateStatus(id: number, status: string) {
    const valid = ['BORRADOR', 'EMITIDO', 'ACEPTADO', 'CANCELADO'];
    if (!valid.includes(status)) {
      throw new Error(`Estado "${status}" no válido. Opciones: ${valid.join(', ')}`);
    }

    return prisma.quote.update({
      where: { id },
      data: { status },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        customer: true
      }
    });
  }

  /**
   * Duplicar un presupuesto
   */
  public static async duplicateQuote(id: number) {
    const original = await this.getQuoteById(id);
    const quoteNumber = await this.generateNextQuoteNumber();

    const itemsToClone: CreateQuoteItemInput[] = original.items.map((it) => ({
      productId: it.productId || undefined,
      variantId: it.variantId || undefined,
      code: it.code || undefined,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      imageUrl: it.imageUrl || undefined,
      sortOrder: it.sortOrder
    }));

    return this.createQuote({
      customerId: original.customerId || undefined,
      clientName: original.clientName,
      clientDocument: original.clientDocument || undefined,
      clientAddress: original.clientAddress || undefined,
      clientPhone: original.clientPhone || undefined,
      clientContact: original.clientContact || undefined,
      date: new Date(),
      validityDays: original.validityDays,
      currency: original.currency,
      exchangeRate: original.exchangeRate,
      introText: original.introText || undefined,
      saleCondition: original.saleCondition,
      paymentMethod: original.paymentMethod || undefined,
      deliveryTime: original.deliveryTime || undefined,
      notes: original.notes || undefined,
      createdByName: original.createdByName || undefined,
      status: 'BORRADOR',
      items: itemsToClone
    });
  }

  /**
   * Eliminar un presupuesto
   */
  public static async deleteQuote(id: number) {
    return prisma.quote.delete({
      where: { id }
    });
  }
}
