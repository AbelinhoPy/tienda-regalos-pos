import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from './prisma';

async function main() {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30));
  const count = await prisma.product.count();
  console.log('Total products in this DB:', count);
  const products = await prisma.product.findMany();
  console.log('Products:', products);
}

main().finally(() => prisma.$disconnect());
