import { Router, Request, Response } from 'express';
import { PurchaseService } from '../services/purchase.service';
import { SaleService } from '../services/sale.service';
import { DebtService } from '../services/debt.service';
import { CashService } from '../services/cash.service';
import { CurrencyService } from '../services/currency.service';
import { CategoryService } from '../services/category.service';
import { DatabaseService } from '../services/database.service';
import { ProductService } from '../services/product.service';
import { CustomerService } from '../services/customer.service';
import { ScannerService } from '../services/scanner.service';
import { QuoteService } from '../services/quote.service';
import { PdfService } from '../services/pdf.service';

export const apiRouter = Router();

// 1. Cotizaciones del Día
apiRouter.get('/currency/rates', async (req: Request, res: Response) => {
  try {
    const rates = await CurrencyService.getDailyRates();
    res.json({ success: true, data: rates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/currency/rates', async (req: Request, res: Response) => {
  try {
    const { brlToGs, usdToGs } = req.body;
    const rates = await CurrencyService.updateDailyRates(Number(brlToGs), Number(usdToGs));
    res.json({ success: true, data: rates });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. Registro de Compras (con Tipo de Cambio Personalizado)
apiRouter.post('/purchases', async (req: Request, res: Response) => {
  try {
    const result = await PurchaseService.registerPurchase(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Procesamiento de Venta POS (Lector de barras, Multimoneda, Fiado)
apiRouter.post('/sales', async (req: Request, res: Response) => {
  try {
    const result = await SaleService.processSale(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.put('/sales/:id', async (req: Request, res: Response) => {
  try {
    const result = await SaleService.updateSale(Number(req.params.id), req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/sales/:id', async (req: Request, res: Response) => {
  try {
    const result = await SaleService.deleteSale(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/sales', async (req: Request, res: Response) => {
  try {
    const result = await SaleService.clearAllSales();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Abono de Deuda (Multimoneda)
apiRouter.post('/debts/payment', async (req: Request, res: Response) => {
  try {
    const result = await DebtService.registerPayment(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Arqueo de Caja Diario
apiRouter.get('/cash/daily-audit', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const result = await CashService.getDailyCashAudit({ date });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Reporte de Cuentas por Cobrar (Deudores)
apiRouter.get('/debts/report', async (req: Request, res: Response) => {
  try {
    const result = await CashService.getDebtorsReport();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Ventas del Día
apiRouter.get('/sales/daily', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const result = await SaleService.getDailySales({ date });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Gestión de Categorías
apiRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await CategoryService.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const result = await CategoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await CategoryService.updateCategory(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await CategoryService.deleteCategory(Number(id));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.post('/categories/initialize', async (req: Request, res: Response) => {
  try {
    await CategoryService.initializeDefaultCategories();
    const categories = await CategoryService.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Gestión de Base de Datos (PELIGROSO - Requiere confirmación)
apiRouter.post('/database/clear', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    
    // Requiere confirmación específica
    if (confirmation !== 'CLEAR_ALL_DATA_CONFIRMED') {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere confirmación. Envía { "confirmation": "CLEAR_ALL_DATA_CONFIRMED" }' 
      });
    }
    
    await DatabaseService.clearAllData();
    res.json({ success: true, message: 'Base de datos limpiada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/database/reset', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    
    // Requiere confirmación específica
    if (confirmation !== 'RESET_DATABASE_CONFIRMED') {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere confirmación. Envía { "confirmation": "RESET_DATABASE_CONFIRMED" }' 
      });
    }
    
    await DatabaseService.resetDatabase();
    res.json({ success: true, message: 'Base de datos reiniciada con datos iniciales' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PRODUCTOS / VARIANTES ────────────────────────────────────────────────────

// Generar código de barras aleatorio garantizado (EAN-13 estándar)
apiRouter.get('/products/generate-barcode', async (req: Request, res: Response) => {
  try {
    const barcode = await ProductService.generateBarcode();
    res.json({ success: true, data: { barcode } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── ESCÁNER REMOTO (CELULAR COMO LECTOR) ──────────────────────────────────────
apiRouter.post('/scanner/session', (req: Request, res: Response) => {
  try {
    const result = ScannerService.createSession();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/scanner/scan', (req: Request, res: Response) => {
  try {
    const { sessionId, barcode } = req.body;
    if (!sessionId || !barcode) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros sessionId o barcode' });
    }
    const result = ScannerService.pushScan(sessionId, barcode);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.get('/scanner/poll/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const since = Number(req.query.since || 0);
    const result = ScannerService.getLatestScans(sessionId, since);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const data = await ProductService.listVariants();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/products', async (req: Request, res: Response) => {
  try {
    const data = await ProductService.createProduct(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const data = await ProductService.updateVariant(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Ajuste rápido de stock (+/-)
apiRouter.patch('/products/:id/stock', async (req: Request, res: Response) => {
  try {
    const { delta } = req.body;
    const data = await ProductService.adjustStock(Number(req.params.id), Number(delta));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    await ProductService.deleteVariant(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Carga masiva desde CSV/texto
apiRouter.post('/products/bulk', async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    const data = await ProductService.bulkCreate(rows);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── CLIENTES ─────────────────────────────────────────────────────────────────

apiRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const data = await CustomerService.list();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/customers', async (req: Request, res: Response) => {
  try {
    const data = await CustomerService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, documentId, phone, email, creditLimitGs } = req.body;
    const data = await CustomerService.update(id, { name, documentId, phone, email, creditLimitGs });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    await CustomerService.deactivate(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── PRESUPUESTOS (QUOTES) ────────────────────────────────────────────────────

apiRouter.get('/quotes', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const quotes = await QuoteService.listQuotes({ search, status });
    res.json({ success: true, data: quotes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/quotes/:id', async (req: Request, res: Response) => {
  try {
    const quote = await QuoteService.getQuoteById(Number(req.params.id));
    res.json({ success: true, data: quote });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

apiRouter.post('/quotes', async (req: Request, res: Response) => {
  try {
    const quote = await QuoteService.createQuote(req.body);
    res.status(201).json({ success: true, data: quote });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.put('/quotes/:id', async (req: Request, res: Response) => {
  try {
    const quote = await QuoteService.updateQuote(Number(req.params.id), req.body);
    res.json({ success: true, data: quote });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.patch('/quotes/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const quote = await QuoteService.updateStatus(Number(req.params.id), status);
    res.json({ success: true, data: quote });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.post('/quotes/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const quote = await QuoteService.duplicateQuote(Number(req.params.id));
    res.status(201).json({ success: true, data: quote });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/quotes/:id', async (req: Request, res: Response) => {
  try {
    await QuoteService.deleteQuote(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Descarga o visualización de PDF de presupuesto
apiRouter.get('/quotes/:id/pdf', async (req: Request, res: Response) => {
  try {
    const quote = await QuoteService.getQuoteById(Number(req.params.id));
    let businessConfig = {};
    if (req.query.business) {
      try {
        businessConfig = JSON.parse(decodeURIComponent(req.query.business as string));
      } catch (e) {
        // usar config por defecto
      }
    }

    const pdfBuffer = await PdfService.generateQuotePdf(quote, businessConfig);
    const safeClient = (quote.clientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Presupuesto_${quote.quoteNumber}_${safeClient}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Previsualización de PDF antes de guardar
apiRouter.post('/quotes/preview-pdf', async (req: Request, res: Response) => {
  try {
    const { quoteData, businessInfo } = req.body;
    if (!quoteData) {
      return res.status(400).json({ success: false, error: 'Faltan datos de presupuesto para previsualizar.' });
    }

    const pdfBuffer = await PdfService.generateQuotePdf(quoteData, businessInfo || {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Preview_Presupuesto.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
