import path from 'path';
import fs from 'fs';
const PdfPrinter = require('pdfmake');

export interface BusinessConfig {
  name?: string;
  legalName?: string;
  ruc?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  logoUrl?: string;
  facebook?: string;
  instagram?: string;
  quoteIntro?: string;
}

export interface QuotePdfData {
  quoteNumber: string;
  date: Date | string;
  validityDays: number;
  currency: string;
  exchangeRate?: number;
  
  clientName: string;
  clientDocument?: string | null;
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientContact?: string | null;
  
  introText?: string | null;
  saleCondition?: string | null;
  paymentMethod?: string | null;
  deliveryTime?: string | null;
  notes?: string | null;
  
  total: number;
  totalInWords?: string | null;
  createdByName?: string | null;
  
  items: Array<{
    code?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    imageUrl?: string | null;
  }>;
}

export class PdfService {
  private static printer: any = null;

  private static getPrinter() {
    if (!this.printer) {
      const fontsDir = path.join(__dirname, '..', '..', 'assets', 'fonts');
      
      let regular = path.join(fontsDir, 'Arial-Regular.ttf');
      let bold = path.join(fontsDir, 'Arial-Bold.ttf');
      let italic = path.join(fontsDir, 'Arial-Italic.ttf');
      let boldItalic = path.join(fontsDir, 'Arial-BoldItalic.ttf');

      // Fallback a fuentes de Windows si no están en assets
      if (!fs.existsSync(regular)) {
        regular = 'C:/Windows/Fonts/arial.ttf';
        bold = 'C:/Windows/Fonts/arialbd.ttf';
        italic = 'C:/Windows/Fonts/ariali.ttf';
        boldItalic = 'C:/Windows/Fonts/arialbi.ttf';
      }

      const fonts = {
        Arial: {
          normal: regular,
          bold: bold,
          italics: italic,
          bolditalics: boldItalic,
        },
      };

      this.printer = new PdfPrinter(fonts);
    }
    return this.printer;
  }

  /**
   * Formatea un número monetario según la divisa
   */
  private static formatCurrency(monto: number, moneda: string = 'GS'): string {
    const isGs = moneda.toUpperCase() === 'GS' || moneda.toUpperCase() === 'PYG';
    const symbol = isGs ? '₲' : moneda.toUpperCase() === 'USD' ? 'US$' : 'R$';

    if (isGs) {
      const parts = Math.round(monto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${symbol}  ${parts}`;
    } else {
      const fixed = monto.toFixed(2);
      const [intPart, decPart] = fixed.split('.');
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${symbol}  ${formattedInt},${decPart}`;
    }
  }

  /**
   * Formatea una fecha a DD/MM/YYYY
   */
  private static formatDate(d: Date | string): string {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Genera el PDF completo del presupuesto en formato A4 vertical
   */
  public static async generateQuotePdf(
    quote: QuotePdfData,
    business: BusinessConfig = {}
  ): Promise<Buffer> {
    const printer = this.getPrinter();

    const formattedDate = this.formatDate(quote.date);
    const validityStr = `${quote.validityDays || 8} DIAS`;
    const currency = quote.currency || 'GS';

    // Textos de empresa
    const companyPhone = business.phone || '+595 993 346 854';
    const companyAddress = business.address || 'Tte Rojas Silva c/ Patricio Colman - CDE';
    const companyEmail = business.email || 'florecerpersonalizadoscde@gmail.com';
    const companyCity = business.city || 'Ciudad del Este';
    const introText =
      quote.introText ||
      business.quoteIntro ||
      'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado';

    // Armado de tabla de ítems
    // Columnas: CÓDIGO | DESCRIPCIÓN | PRECIO | CANTIDAD | TOTAL | IMAGEN
    // Anchos: 45, '*', 70, 45, 75, 55 (suma total = 525pt, cabe perfecto en A4)
    const tableBody: any[] = [];

    // Encabezado de la tabla
    tableBody.push([
      { text: 'CODIGO', style: 'tableHeader', alignment: 'center' },
      { text: 'DESCRIPCION', style: 'tableHeader', alignment: 'left' },
      { text: 'PRECIO', style: 'tableHeader', alignment: 'center' },
      { text: 'CANTIDAD', style: 'tableHeader', alignment: 'center' },
      { text: 'TOTAL', style: 'tableHeader', alignment: 'center' },
      { text: 'IMAGEN', style: 'tableHeader', alignment: 'center' },
    ]);

    // Filas de productos
    for (const item of quote.items) {
      const codeCell = { text: item.code || '', style: 'tableCell', alignment: 'center' };
      const descCell = { text: item.description.toUpperCase(), style: 'tableCellDesc', alignment: 'left' };
      const priceCell = { text: this.formatCurrency(item.unitPrice, currency), style: 'tableCell', alignment: 'right' };
      const qtyCell = { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' };
      const totalCell = { text: this.formatCurrency(item.total, currency), style: 'tableCell', alignment: 'right' };

      let imgCell: any = { text: '', style: 'tableCell', alignment: 'center' };
      if (item.imageUrl && (item.imageUrl.startsWith('data:image/') || item.imageUrl.startsWith('http') || fs.existsSync(item.imageUrl))) {
        try {
          imgCell = {
            image: item.imageUrl,
            fit: [45, 45],
            alignment: 'center',
            margin: [0, 2, 0, 2],
          };
        } catch (e) {
          imgCell = { text: '', style: 'tableCell' };
        }
      }

      tableBody.push([codeCell, descCell, priceCell, qtyCell, totalCell, imgCell]);
    }

    // Fila de TOTAL destacado
    const formattedTotal = this.formatCurrency(quote.total, currency);
    tableBody.push([
      {
        text: 'TOTAL:',
        colSpan: 4,
        style: 'totalLabelCell',
        alignment: 'right',
        fillColor: '#6B7280',
      },
      {},
      {},
      {},
      {
        text: formattedTotal,
        style: 'totalValueCell',
        alignment: 'right',
        fillColor: '#6B7280',
      },
      {
        text: '',
        fillColor: '#6B7280',
      },
    ]);

    // Procesar logo si está disponible
    let headerLogo: any = {
      text: business.name || 'florecer',
      style: 'companyLogoText',
    };
    if (business.logoUrl && (business.logoUrl.startsWith('data:image/') || fs.existsSync(business.logoUrl))) {
      try {
        headerLogo = {
          image: business.logoUrl,
          fit: [140, 60],
          alignment: 'left',
        };
      } catch (e) {
        headerLogo = { text: business.name || 'florecer', style: 'companyLogoText' };
      }
    }

    let footerLogo: any = {
      text: business.name || 'florecer',
      style: 'companyLogoTextMini',
    };
    if (business.logoUrl && (business.logoUrl.startsWith('data:image/') || fs.existsSync(business.logoUrl))) {
      try {
        footerLogo = {
          image: business.logoUrl,
          fit: [80, 40],
          alignment: 'right',
        };
      } catch (e) {
        footerLogo = { text: business.name || 'florecer', style: 'companyLogoTextMini' };
      }
    }

    // Document Definition de pdfmake
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [35, 30, 35, 45],
      defaultStyle: {
        font: 'Arial',
        fontSize: 8,
        color: '#111827',
      },
      content: [
        // ── Cabecera Superior: Logo y Contacto ──
        {
          columns: [
            headerLogo,
            {
              stack: [
                { text: companyPhone, alignment: 'right', style: 'headerContact' },
                { text: companyAddress, alignment: 'right', style: 'headerContact' },
                { text: companyEmail, alignment: 'right', style: 'headerContact' },
              ],
            },
          ],
          margin: [0, 0, 0, 10],
        },

        // Título "Presupuesto de Venta"
        {
          text: 'Presupuesto de Venta',
          style: 'docTitle',
          alignment: 'right',
          margin: [0, 0, 0, 4],
        },

        // ── Bloque Datos del Presupuesto y Cliente ──
        {
          columns: [
            // Columna Izquierda
            {
              width: '55%',
              stack: [
                {
                  columns: [
                    { text: 'Fecha:', width: 65, bold: true },
                    { text: formattedDate, width: '*' },
                  ],
                  margin: [0, 1, 0, 1],
                },
                {
                  columns: [
                    { text: 'Señores:', width: 65, bold: true },
                    { text: quote.clientName.toUpperCase(), width: '*', bold: true },
                  ],
                  margin: [0, 1, 0, 1],
                },
                {
                  columns: [
                    { text: 'Dirección:', width: 65, bold: true },
                    { text: quote.clientAddress || '', width: '*' },
                  ],
                  margin: [0, 1, 0, 1],
                },
              ],
            },
            // Columna Derecha
            {
              width: '45%',
              stack: [
                {
                  columns: [
                    { text: 'Validez de la oferta:', width: 95, fontSize: 7.5 },
                    { text: validityStr, width: '*', bold: true, fontSize: 7.5 },
                  ],
                  margin: [0, 1, 0, 1],
                },
                {
                  columns: [
                    { text: 'RUC:', width: 50, bold: true },
                    { text: quote.clientDocument || '', width: '*' },
                  ],
                  margin: [0, 1, 0, 1],
                },
                {
                  columns: [
                    { text: 'Teléfono:', width: 50, bold: true },
                    { text: quote.clientPhone || '', width: '*' },
                  ],
                  margin: [0, 1, 0, 1],
                },
                {
                  columns: [
                    { text: 'Contacto:', width: 50, bold: true },
                    { text: quote.clientContact || '', width: '*' },
                  ],
                  margin: [0, 1, 0, 1],
                },
              ],
            },
          ],
          margin: [0, 0, 0, 10],
        },

        // ── Párrafo Introductorio ──
        {
          text: introText,
          style: 'introText',
          margin: [0, 0, 0, 10],
        },

        // ── Tabla de Ítems ──
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: [45, '*', 70, 45, 75, 55],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i: number, node: any) => 0.7,
            vLineWidth: (i: number, node: any) => 0.7,
            hLineColor: (i: number, node: any) => '#9CA3AF',
            vLineColor: (i: number, node: any) => '#9CA3AF',
            paddingLeft: (i: number) => 4,
            paddingRight: (i: number) => 4,
            paddingTop: (i: number) => 4,
            paddingBottom: (i: number) => 4,
          },
          margin: [0, 0, 0, 10],
        },

        // ── Condiciones Comerciales y Monto en Letras ──
        {
          stack: [
            {
              columns: [
                { text: 'Monto en letras:', width: 110, bold: true },
                { text: (quote.totalInWords || '').toUpperCase(), width: '*' },
              ],
              margin: [0, 2, 0, 4],
            },
            {
              columns: [
                { text: 'Condicion de ventas:', width: 110, bold: true },
                { text: (quote.saleCondition || 'CONTADO').toUpperCase(), width: '*' },
              ],
              margin: [0, 2, 0, 2],
            },
            {
              columns: [
                { text: 'Modo de pago:', width: 110, bold: true },
                { text: (quote.paymentMethod || '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE').toUpperCase(), width: '*' },
              ],
              margin: [0, 2, 0, 2],
            },
            {
              columns: [
                { text: 'Plazo de entrega:', width: 110, bold: true },
                { text: (quote.deliveryTime || '3 DÍAS HÁBILES').toUpperCase(), width: '*' },
              ],
              margin: [0, 2, 0, 2],
            },
            ...(quote.notes
              ? [
                  {
                    columns: [
                      { text: 'Observación:', width: 110, bold: true },
                      { text: quote.notes, width: '*' },
                    ],
                    margin: [0, 2, 0, 2],
                  },
                ]
              : []),
          ],
          margin: [0, 5, 0, 25],
        },

        // ── Firmas (Cliente / Dpto Comercial) ──
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 130,
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 0.8, lineColor: '#4B5563' }] },
                { text: 'Cliente', alignment: 'center', fontSize: 8, margin: [0, 3, 0, 0] },
              ],
            },
            { width: 50, text: '' },
            {
              width: 130,
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 0.8, lineColor: '#4B5563' }] },
                { text: quote.createdByName || 'Dpto Comercial', alignment: 'center', fontSize: 8, margin: [0, 3, 0, 0] },
              ],
            },
            { width: 30, text: '' },
          ],
          margin: [0, 10, 0, 20],
        },

        // ── Pie de Página con Redes Sociales y Datos de Contacto ──
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 0.6, lineColor: '#D1D5DB' }] },
            {
              columns: [
                // Redes y Contacto
                {
                  width: '75%',
                  stack: [
                    {
                      columns: [
                        { text: `f  ${business.facebook || 'Florecer Personalizados'}`, width: 140, fontSize: 7 },
                        { text: `+595 993 346 854`, width: 120, fontSize: 7 },
                        { text: companyCity, width: '*', fontSize: 7, bold: true },
                      ],
                      margin: [0, 4, 0, 2],
                    },
                    {
                      columns: [
                        { text: `@  ${business.instagram || 'florecerpersonalizadoscde'}`, width: 140, fontSize: 7 },
                        { text: companyEmail, width: 160, fontSize: 7 },
                        { text: companyAddress, width: '*', fontSize: 6.5 },
                      ],
                      margin: [0, 2, 0, 0],
                    },
                  ],
                },
                // Logo Derecho
                {
                  width: '25%',
                  alignment: 'right',
                  stack: [footerLogo],
                },
              ],
              margin: [0, 4, 0, 0],
            },
          ],
        },
      ],

      styles: {
        companyLogoText: {
          fontSize: 22,
          bold: true,
          italics: true,
          color: '#1E293B',
        },
        companyLogoTextMini: {
          fontSize: 16,
          bold: true,
          italics: true,
          color: '#334155',
        },
        headerContact: {
          fontSize: 7.5,
          color: '#1F2937',
          margin: [0, 1, 0, 1],
        },
        docTitle: {
          fontSize: 10,
          bold: true,
          color: '#1F2937',
        },
        introText: {
          fontSize: 7.5,
          color: '#374151',
          lineHeight: 1.15,
        },
        tableHeader: {
          fontSize: 7.5,
          bold: true,
          fillColor: '#D4EEF2', // Celeste claro idéntico al PDF de referencia
          color: '#000000',
          margin: [0, 2, 0, 2],
        },
        tableCell: {
          fontSize: 8,
          margin: [0, 2, 0, 2],
        },
        tableCellDesc: {
          fontSize: 7.5,
          bold: true,
          margin: [0, 2, 0, 2],
        },
        totalLabelCell: {
          fontSize: 9,
          bold: true,
          color: '#FFFFFF',
          margin: [0, 3, 0, 3],
        },
        totalValueCell: {
          fontSize: 9,
          bold: true,
          color: '#FFFFFF',
          margin: [0, 3, 0, 3],
        },
      },
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
