import { prisma } from '../prisma';

export class CustomerService {
  private static async validateDocument(documentId?: string, excludeId?: number) {
    const normalized = documentId?.replace(/[.\s]/g, '');
    if (!normalized) return;
    const customers = await prisma.customer.findMany({ where: { isActive: true }, select: { id: true, documentId: true } });
    if (customers.some(c => c.id !== excludeId && c.documentId?.replace(/[.\s]/g, '') === normalized)) {
      throw new Error('Ya existe un cliente con ese RUC o C.I. Selecciónelo en el listado de clientes.');
    }
  }

  static async list() {
    return prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async create(input: {
    name: string;
    documentId?: string;
    phone?: string;
    email?: string;
    creditLimitGs?: number;
  }) {
    if (!input.name?.trim()) throw new Error('El nombre es obligatorio');
    await this.validateDocument(input.documentId);
    return prisma.customer.create({
      data: {
        name: input.name.trim(),
        documentId: input.documentId?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        creditLimitGs: Number(input.creditLimitGs) || 0,
        saldoPendienteGs: 0,
      },
    });
  }

  static async update(id: number, input: {
    name?: string;
    documentId?: string;
    phone?: string;
    email?: string;
    creditLimitGs?: number;
  }) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new Error('Cliente no encontrado');
    if (input.documentId !== undefined) await this.validateDocument(input.documentId, id);
    return prisma.customer.update({
      where: { id },
      data: {
        name: input.name?.trim() || existing.name,
        documentId: input.documentId !== undefined ? input.documentId?.trim() || null : existing.documentId,
        phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
        email: input.email !== undefined ? input.email?.trim() || null : existing.email,
        creditLimitGs: input.creditLimitGs !== undefined ? Number(input.creditLimitGs) : existing.creditLimitGs,
      },
    });
  }

  static async deactivate(id: number) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new Error('Cliente no encontrado');
    return prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
