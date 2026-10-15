export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export class CategoryService {
  /**
   * Obtener todas las categorías activas
   */
  public static async getAllCategories(dbClient?: any): Promise<Category[]> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = dbClient || new PrismaClient();
    
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
      
      return categories;
    } catch (error) {
      if (!dbClient) {
        await prisma.$disconnect();
      }
      throw error;
    }
  }

  /**
   * Crear una nueva categoría
   */
  public static async createCategory(input: CreateCategoryInput, dbClient?: any): Promise<Category> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = dbClient || new PrismaClient();
    
    try {
      const category = await prisma.category.create({
        data: {
          name: input.name,
          description: input.description,
          sortOrder: input.sortOrder || 0
        }
      });
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
      
      return category;
    } catch (error) {
      if (!dbClient) {
        await prisma.$disconnect();
      }
      throw error;
    }
  }

  /**
   * Actualizar una categoría existente
   */
  public static async updateCategory(id: number, input: UpdateCategoryInput, dbClient?: any): Promise<Category> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = dbClient || new PrismaClient();
    
    try {
      const category = await prisma.category.update({
        where: { id },
        data: input
      });
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
      
      return category;
    } catch (error) {
      if (!dbClient) {
        await prisma.$disconnect();
      }
      throw error;
    }
  }

  /**
   * Eliminar (desactivar) una categoría
   */
  public static async deleteCategory(id: number, dbClient?: any): Promise<Category> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = dbClient || new PrismaClient();
    
    try {
      const category = await prisma.category.update({
        where: { id },
        data: { isActive: false }
      });
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
      
      return category;
    } catch (error) {
      if (!dbClient) {
        await prisma.$disconnect();
      }
      throw error;
    }
  }

  /**
   * Obtener categorías predeterminadas para inicializar el sistema
   */
  public static async initializeDefaultCategories(dbClient?: any): Promise<void> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = dbClient || new PrismaClient();
    
    try {
      const defaultCategories = [
        { name: 'Tazas & Vasos Personalizados', description: 'Tazas mágicas, mugs, vasos térmicos y chop de vidrio', sortOrder: 1 },
        { name: 'Termos & Choperas Grabadas', description: 'Termos Stanley, grabados láser y manijas artesanales', sortOrder: 2 },
        { name: 'Remeras & Cuadros Personalizados', description: 'Remeras estampadas, bordadas y cuadros decorativos', sortOrder: 3 },
        { name: 'Agendas & Papelería Creativa', description: 'Agendas perpetuas, cuadernos artesanales y stickers', sortOrder: 4 },
        { name: 'Cajas de Regalo & Canastas', description: 'Cajas sorpresa para cumpleaños, fechas especiales y canastas', sortOrder: 5 },
        { name: 'Llaveros & Accesorios', description: 'Llaveros acrílicos, metálicos y pines personalizados', sortOrder: 6 },
        { name: 'Volantes, Folletos & Tarjetería', description: 'Impresión de volantes publicitarios, dípticos y tarjetas', sortOrder: 7 },
        { name: 'Souvenirs & Eventos', description: 'Recuerdos para bodas, 15 años, bautismos y cumpleaños', sortOrder: 8 },
        { name: 'Regalos Corporativos', description: 'Merchandising para empresas, kits ejecutivos y regalos de fin de año', sortOrder: 9 },
        { name: 'Grabados Láser & Corte', description: 'Grabados en madera, cuero, metales y acrílicos', sortOrder: 10 }
      ];
      
      for (const cat of defaultCategories) {
        await prisma.category.upsert({
          where: { name: cat.name },
          update: {},
          create: cat
        });
      }
      
      if (!dbClient) {
        await prisma.$disconnect();
      }
    } catch (error) {
      if (!dbClient) {
        await prisma.$disconnect();
      }
      console.error('Error initializing default categories:', error);
    }
  }
}