-- AlterTable
ALTER TABLE "ProductVariant" 
    ALTER COLUMN "size" SET DEFAULT 'Estándar',
    ALTER COLUMN "color" SET DEFAULT 'Estándar',
    ADD COLUMN IF NOT EXISTS "material" TEXT,
    ADD COLUMN IF NOT EXISTS "presentation" TEXT,
    ADD COLUMN IF NOT EXISTS "sku" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Quote" (
    "id" SERIAL NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validityDays" INTEGER NOT NULL DEFAULT 8,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'GS',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "customerId" INTEGER,
    "clientName" TEXT NOT NULL,
    "clientDocument" TEXT,
    "clientAddress" TEXT,
    "clientPhone" TEXT,
    "clientContact" TEXT,
    "introText" TEXT,
    "saleCondition" TEXT NOT NULL DEFAULT 'CONTADO',
    "paymentMethod" TEXT,
    "deliveryTime" TEXT,
    "notes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInWords" TEXT,
    "createdByName" TEXT DEFAULT 'Dpto Comercial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "QuoteItem" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "productId" INTEGER,
    "variantId" INTEGER,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE INDEX IF NOT EXISTS "Quote_date_idx" ON "Quote"("date");
CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Quote_customerId_fkey') THEN
        ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteItem_quoteId_fkey') THEN
        ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteItem_productId_fkey') THEN
        ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteItem_variantId_fkey') THEN
        ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
