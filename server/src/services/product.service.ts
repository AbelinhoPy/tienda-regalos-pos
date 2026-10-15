import { prisma } from '../prisma';

export interface VariantDto {
  id: number;
  productId: number;
  productName: string;
  category: string;
  brand?: string | null;
  imageUrl?: string | null;
  barcode: string;
  size: string;
  color: string;
  material?: string | null;
  presentation?: string | null;
  sku?: string | null;
  stock: number;
  minStock: number;
  costoGsReal: number;
  precioVentaGs: number;
}

function mapVariant(v: any): VariantDto {
  return {
    id: v.id,
    productId: v.productId,
    productName: v.product.name,
    category: v.product.category?.name || v.product.categoryName || 'Sin categoría',
    brand: v.product.brand,
    imageUrl: v.product.imageUrl,
    barcode: v.barcode,
    size: v.size || 'Estándar',
    color: v.color || 'Estándar',
    material: v.material,
    presentation: v.presentation,
    sku: v.sku,
    stock: v.stock,
    minStock: v.minStock,
    costoGsReal: v.costoGsReal,
    precioVentaGs: v.precioVentaGs,
  };
}

const variantInclude = {
  product: { include: { category: true } },
};

async function ensureCategory(name: string) {
  const trimmed = (name || 'Sin categoría').trim();
  const existing = await prisma.category.findUnique({ where: { name: trimmed } });
  if (existing) return existing;
  return prisma.category.create({
    data: { name: trimmed, isActive: true, sortOrder: 99 },
  });
}

export function generateEAN13(prefix = '784'): string {
  let code = prefix;
  while (code.length < 12) {
    code += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${code}${checkDigit}`;
}

async function getGuaranteedUniqueBarcode(): Promise<string> {
  let attempts = 0;
  while (attempts < 50) {
    const candidate = generateEAN13();
    const existing = await prisma.productVariant.findUnique({ where: { barcode: candidate } });
    if (!existing) return candidate;
    attempts++;
  }
  // Respaldo garantizado basado en timestamp
  return `784${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
}

function nextBarcode() {
  return generateEAN13();
}

export class ProductService {
  static async generateBarcode(): Promise<string> {
    return getGuaranteedUniqueBarcode();
  }

  static async listVariants(): Promise<VariantDto[]> {
    const variants = await prisma.productVariant.findMany({
      where: { product: { isActive: true } },
      include: variantInclude,
      orderBy: { id: 'desc' },
    });
    return variants.map(mapVariant);
  }

  static async createProduct(input: {
    name: string;
    category: string;
    brand?: string;
    imageUrl?: string;
    variants?: Array<{
      size?: string;
      color?: string;
      material?: string;
      presentation?: string;
      sku?: string;
      stock?: number;
      minStock?: number;
      costoGs?: number;
      precioGs?: number;
      barcode?: string;
    }>;
  }): Promise<VariantDto[]> {
    if (!input.name || !input.name.trim()) {
      throw new Error('El nombre del producto es obligatorio.');
    }

    const category = await ensureCategory(input.category);
    const baseCode = `P${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const rawVariants = input.variants && input.variants.length > 0
      ? input.variants
      : [{ size: 'Estándar', color: 'Estándar', stock: 1, minStock: 2, costoGs: 0, precioGs: 0 }];

    const usedCombos = new Set<string>();
    const usedBarcodesInRequest = new Set<string>();
    const preparedVariants = [];

    for (let i = 0; i < rawVariants.length; i++) {
      const row = rawVariants[i];
      const size = (row.size || 'Estándar').trim();
      const color = (row.color || 'Estándar').trim();
      const comboKey = `${size.toLowerCase()}___${color.toLowerCase()}`;

      if (usedCombos.has(comboKey) && rawVariants.length > 1) {
        throw new Error(`Hay variantes duplicadas con especificación "${size}" y "${color}". Cada variante debe tener una característica diferente.`);
      }
      usedCombos.add(comboKey);

      let barcode = row.barcode?.trim();
      if (!barcode) {
        barcode = await getGuaranteedUniqueBarcode();
      } else {
        if (usedBarcodesInRequest.has(barcode)) {
          throw new Error(`El código de barras "${barcode}" está repetido en más de una variante de este producto.`);
        }
        const existing = await prisma.productVariant.findUnique({
          where: { barcode },
          include: { product: true },
        });
        if (existing) {
          throw new Error(`El código de barras "${barcode}" ya pertenece al producto "${existing.product.name}". Usá otro código o generá uno aleatorio.`);
        }
      }

      usedBarcodesInRequest.add(barcode);
      preparedVariants.push({
        barcode,
        size,
        color,
        material: row.material?.trim() || null,
        presentation: row.presentation?.trim() || null,
        sku: row.sku?.trim() || null,
        stock: Number(row.stock) || 0,
        minStock: Number(row.minStock) || 2,
        costoGsReal: Number(row.costoGs) || 0,
        precioVentaGs: Number(row.precioGs) || 0,
      });
    }

    const product = await prisma.product.create({
      data: {
        baseCode,
        name: input.name.trim(),
        categoryId: category.id,
        categoryName: category.name,
        brand: input.brand?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        variants: {
          create: preparedVariants,
        },
      },
      include: { variants: { include: variantInclude } },
    });

    const created = await prisma.productVariant.findMany({
      where: { productId: product.id },
      include: variantInclude,
    });
    return created.map(mapVariant);
  }

  static async updateVariant(
    id: number,
    input: {
      productName?: string;
      category?: string;
      brand?: string;
      imageUrl?: string;
      size?: string;
      color?: string;
      material?: string;
      presentation?: string;
      sku?: string;
      stock?: number;
      minStock?: number;
      costoGs?: number;
      precioGs?: number;
      barcode?: string;
    }
  ): Promise<VariantDto> {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!variant) throw new Error('Variante no encontrada');

    // Validar código de barras si se cambia
    let targetBarcode = variant.barcode;
    if (input.barcode && input.barcode.trim()) {
      targetBarcode = input.barcode.trim();
      if (targetBarcode !== variant.barcode) {
        const existing = await prisma.productVariant.findUnique({
          where: { barcode: targetBarcode },
          include: { product: true },
        });
        if (existing && existing.id !== id) {
          throw new Error(`El código de barras "${targetBarcode}" ya pertenece al producto "${existing.product.name}". Usá otro código o generá uno aleatorio.`);
        }
      }
    }

    const newSize = input.size !== undefined ? input.size.trim() : variant.size;
    const newColor = input.color !== undefined ? input.color.trim() : variant.color;
    if (newSize !== variant.size || newColor !== variant.color) {
      const existingCombo = await prisma.productVariant.findFirst({
        where: {
          productId: variant.productId,
          size: newSize,
          color: newColor,
          id: { not: id },
        },
      });
      if (existingCombo) {
        throw new Error(`Ya existe otra variante de este producto con "${newSize}" y "${newColor}".`);
      }
    }

    let categoryId = variant.product.categoryId;
    let categoryName = variant.product.categoryName;
    if (input.category) {
      const cat = await ensureCategory(input.category);
      categoryId = cat.id;
      categoryName = cat.name;
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: variant.productId },
        data: {
          name: input.productName?.trim() || variant.product.name,
          categoryId,
          categoryName,
          brand: input.brand !== undefined ? input.brand.trim() || null : variant.product.brand,
          imageUrl: input.imageUrl !== undefined ? input.imageUrl.trim() || null : variant.product.imageUrl,
        },
      }),
      prisma.productVariant.update({
        where: { id },
        data: {
          size: newSize,
          color: newColor,
          material: input.material !== undefined ? input.material?.trim() || null : variant.material,
          presentation: input.presentation !== undefined ? input.presentation?.trim() || null : variant.presentation,
          sku: input.sku !== undefined ? input.sku?.trim() || null : variant.sku,
          stock: input.stock !== undefined ? Number(input.stock) : variant.stock,
          minStock: input.minStock !== undefined ? Number(input.minStock) : variant.minStock,
          costoGsReal: input.costoGs !== undefined ? Number(input.costoGs) : variant.costoGsReal,
          precioVentaGs: input.precioGs !== undefined ? Number(input.precioGs) : variant.precioVentaGs,
          barcode: targetBarcode,
        },
      }),
    ]);

    const updated = await prisma.productVariant.findUniqueOrThrow({
      where: { id },
      include: variantInclude,
    });
    return mapVariant(updated);
  }

  static async adjustStock(id: number, delta: number): Promise<VariantDto> {
    const updated = await prisma.productVariant.update({
      where: { id },
      data: { stock: { increment: delta } },
      include: variantInclude,
    });
    if (updated.stock < 0) {
      await prisma.productVariant.update({
        where: { id },
        data: { stock: 0 },
      });
      const zero = await prisma.productVariant.findUniqueOrThrow({
        where: { id },
        include: variantInclude,
      });
      return mapVariant(zero);
    }
    return mapVariant(updated);
  }

  static async deleteVariant(id: number): Promise<void> {
    const variant = await prisma.productVariant.findUnique({ where: { id } });
    if (!variant) throw new Error('Variante no encontrada');
    await prisma.saleItem.deleteMany({ where: { variantId: id } });
    await prisma.purchaseItem.deleteMany({ where: { variantId: id } });
    await prisma.quoteItem.deleteMany({ where: { variantId: id } });
    await prisma.productVariant.delete({ where: { id } });
    const remaining = await prisma.productVariant.count({ where: { productId: variant.productId } });
    if (remaining === 0) {
      await prisma.product.delete({ where: { id: variant.productId } });
    }
  }

  static async bulkCreate(
    rows: Array<{
      barcode?: string;
      productName: string;
      category?: string;
      brand?: string;
      size?: string;
      color?: string;
      material?: string;
      presentation?: string;
      stock?: number;
      precioVentaGs?: number;
      costoGsReal?: number;
    }>
  ): Promise<VariantDto[]> {
    const created: VariantDto[] = [];
    for (const row of rows) {
      const variants = await this.createProduct({
        name: row.productName,
        category: row.category || 'Regalos',
        brand: row.brand,
        variants: [{
          size: row.size || 'Estándar',
          color: row.color || 'Estándar',
          material: row.material,
          presentation: row.presentation,
          stock: row.stock ?? 0,
          minStock: 2,
          costoGs: row.costoGsReal ?? 0,
          precioGs: row.precioVentaGs ?? 0,
          barcode: row.barcode || nextBarcode(),
        }],
      });
      created.push(...variants);
    }
    return created;
  }

  static async upsertVariantFromPurchase(item: {
    variantId?: number;
    barcode?: string;
    productName?: string;
    category?: string;
    size?: string;
    color?: string;
    quantity: number;
    costoGsReal: number;
    precioVentaGs: number;
  }) {
    if (item.variantId) {
      return prisma.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: { increment: item.quantity },
          costoGsReal: item.costoGsReal,
          precioVentaGs: item.precioVentaGs,
        },
      });
    }

    const barcode = item.barcode?.trim() || nextBarcode();
    const existing = await prisma.productVariant.findUnique({ where: { barcode } });
    if (existing) {
      return prisma.productVariant.update({
        where: { id: existing.id },
        data: {
          stock: { increment: item.quantity },
          costoGsReal: item.costoGsReal,
          precioVentaGs: item.precioVentaGs,
        },
      });
    }

    const name = (item.productName || 'Producto').trim();
    const category = await ensureCategory(item.category || 'Regalos');
    let product = await prisma.product.findFirst({
      where: { name, categoryId: category.id },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          baseCode: `P${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 99)}`,
          name,
          categoryId: category.id,
          categoryName: category.name,
        },
      });
    }

    return prisma.productVariant.create({
      data: {
        productId: product.id,
        barcode,
        size: item.size || 'Estándar',
        color: item.color || 'Estándar',
        stock: item.quantity,
        minStock: 2,
        costoGsReal: item.costoGsReal,
        precioVentaGs: item.precioVentaGs,
      },
    });
  }
}
