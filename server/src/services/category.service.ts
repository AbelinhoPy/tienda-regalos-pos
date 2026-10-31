export interface Category {
  id: number;
  name: string;
  family?: string | null;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  family?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  family?: string;
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
          family: input.family || null,
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
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.family !== undefined && { family: input.family }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
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
   * Obtener categorías predeterminadas para inicializar el sistema con Familias y Subdivisiones oficiales
   */
  public static async initializeDefaultCategories(dbClient?: any): Promise<void> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = dbClient || new PrismaClient();
    
    try {
      const defaultCategories: Array<{ name: string; family: string; description: string; sortOrder: number }> = [
        // 1. BRANDING Y PACKAGING
        { name: 'Etiquetas', family: 'BRANDING Y PACKAGING', description: 'Etiquetas personalizadas para productos y empaques', sortOrder: 1 },
        { name: 'Bolsas de papel', family: 'BRANDING Y PACKAGING', description: 'Bolsas kraft y papel personalizadas con logo', sortOrder: 2 },
        { name: 'Imanes', family: 'BRANDING Y PACKAGING', description: 'Imanes publicitarios y recordatorios imantados', sortOrder: 3 },

        // 2. PAPELERÍA CORPORATIVA
        { name: 'Tarjetas personales', family: 'PAPELERÍA CORPORATIVA', description: 'Tarjetas de presentación en laminado mate, brillante o especiales', sortOrder: 4 },
        { name: 'Tarjetas de agradecimiento', family: 'PAPELERÍA CORPORATIVA', description: 'Tarjetas postales para clientes y pedidos', sortOrder: 5 },
        { name: 'Hojas membretadas', family: 'PAPELERÍA CORPORATIVA', description: 'Hojas A4 corporativas con membrete institucional', sortOrder: 6 },
        { name: 'Volantes', family: 'PAPELERÍA CORPORATIVA', description: 'Volantes publicitarios simple y doble faz', sortOrder: 7 },
        { name: 'Adhesivos/stickers', family: 'PAPELERÍA CORPORATIVA', description: 'Stickers en vinilo y papel con corte troquelado', sortOrder: 8 },
        { name: 'Kit emprendedor', family: 'PAPELERÍA CORPORATIVA', description: 'Paquetes completos de papelería para negocios', sortOrder: 9 },

        // 3. REGALOS Y MERCHANDISING
        { name: 'Llaveros', family: 'REGALOS Y MERCHANDISING', description: 'Llaveros acrílicos, metálicos y personalizados', sortOrder: 10 },
        { name: 'Alcancías', family: 'REGALOS Y MERCHANDISING', description: 'Alcancías personalizadas para eventos y empresas', sortOrder: 11 },
        { name: 'Souvenirs', family: 'REGALOS Y MERCHANDISING', description: 'Recuerdos especiales para bodas, 15 años y bautismos', sortOrder: 12 },
        { name: 'Canastas', family: 'REGALOS Y MERCHANDISING', description: 'Canastas de regalo armadas y personalizadas', sortOrder: 13 },
        { name: 'Regalos empresariales', family: 'REGALOS Y MERCHANDISING', description: 'Kits y obsequios corporativos de fin de año y aniversarios', sortOrder: 14 },

        // 4. PRODUCTOS PERSONALIZADOS
        { name: 'Álbumes', family: 'PRODUCTOS PERSONALIZADOS', description: 'Álbumes de fotos con tapas duras personalizadas', sortOrder: 15 },
        { name: 'Fotolibro', family: 'PRODUCTOS PERSONALIZADOS', description: 'Fotolibros impresos de alta resolución', sortOrder: 16 },
        { name: 'Cuadros', family: 'PRODUCTOS PERSONALIZADOS', description: 'Cuadros decorativos en lienzo y marcos de madera', sortOrder: 17 },
        { name: 'Papelería especial', family: 'PRODUCTOS PERSONALIZADOS', description: 'Agendas, planificadores y cuadernos artesanales', sortOrder: 18 },

        // 5. BAZAR & ARTÍCULOS SUBLIMADOS
        { name: 'Tazas & Vasos Personalizados', family: 'BAZAR & ARTÍCULOS SUBLIMADOS', description: 'Tazas mágicas, mugs, vasos térmicos y chop de vidrio', sortOrder: 19 },
        { name: 'Termos & Choperas Grabadas', family: 'BAZAR & ARTÍCULOS SUBLIMADOS', description: 'Termos Stanley, grabados láser y manijas artesanales', sortOrder: 20 },
        { name: 'Grabados Láser & Corte', family: 'BAZAR & ARTÍCULOS SUBLIMADOS', description: 'Grabados en madera, cuero, metales y acrílicos', sortOrder: 21 },
      ];
      
      for (const cat of defaultCategories) {
        await prisma.category.upsert({
          where: { name: cat.name },
          update: {
            family: cat.family,
            description: cat.description,
            sortOrder: cat.sortOrder,
          },
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