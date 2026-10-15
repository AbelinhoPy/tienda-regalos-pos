# 🎁 Tienda de Regalos & Personalizados - POS, ERP & Presupuestos PDF

Sistema integral de gestión comercial, punto de venta (POS), control de productos estándar y variantes personalizadas, cotización multimoneda (**Guaraníes ₲**, **Reales R$**, **Dólares US$**) y **Módulo Profesional de Presupuestos** con generación y previsualización de documentos PDF formato A4 vertical listos para exportar e imprimir.

---

## 🚀 Arquitectura y Tecnologías

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Modo Oscuro/Claro), Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM.
- **Motor de PDF**: `pdfmake` con tipografías TrueType integradas (soporte nativo para el símbolo `₲`, diacríticos y acentos en español).
- **Base de Datos**: PostgreSQL (Producción / Local) o SQLite compatible con Prisma.
- **Moneda Base**: Guaraníes (PYG).
- **Monedas Secundarias**: Real Brasileño (BRL), Dólar Estadounidense (USD).

---

## 📂 Estructura del Proyecto

```
tienda_de_regalos/
├── client/                     # Frontend SPA (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── quotes/         # Presupuestos: Editor, Listado, Visor PDF interactivo
│   │   │   ├── business/       # Datos fiscales, redes sociales y contacto para presupuestos
│   │   │   ├── pos/            # Caja POS, cobro multimoneda y alerta de deudor
│   │   │   ├── products/       # Catálogo de regalos (simples y variantes flexibles)
│   │   │   ├── purchases/      # Compras con cotización real
│   │   │   ├── reports/        # Arqueo diario y ganancia neta real
│   │   │   └── debtors/        # Cuentas por cobrar y abonos
│   │   ├── types/              # Tipos TypeScript (Quote, BusinessInfo, etc.)
│   │   └── App.tsx             # Enrutamiento y estado global
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend REST API (Node.js + Express + TypeScript)
│   ├── assets/fonts/           # Fuentes TrueType para generación fiel de PDFs
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos Prisma (Quote, QuoteItem, ProductVariant, etc.)
│   │   └── seed.ts             # Semilla inicial con categorías y presupuesto de prueba
│   ├── src/
│   │   ├── services/
│   │   │   ├── pdf.service.ts      # Generador de presupuestos A4 réplica fiel
│   │   │   ├── quote.service.ts    # CRUD de presupuestos, snapshots y numeración
│   │   │   ├── product.service.ts  # Productos de regalos y variantes flexibles
│   │   │   └── sale.service.ts     # Ventas y reportes
│   │   ├── utils/
│   │   │   └── numberToWords.ts    # Conversor exacto de montos a letras (Guaraníes)
│   │   ├── routes/api.routes.ts    # Endpoints REST API (/api/quotes, /api/products, etc.)
│   │   └── server.ts               # Servidor Express
│   ├── package.json
│   └── tsconfig.json
│
└── INICIAR_SISTEMA.bat         # Launcher rápido para Windows (Backend + Frontend)
```

---

## ✨ Módulo de Presupuestos (Características Principales)

1. **Numeración Automática**: Formato secuencial configurable (`PPTO-000001`, `000123`, etc.).
2. **Snapshot Histórico Inmutable**: Los presupuestos guardan una copia exacta del cliente (nombre, RUC, teléfono, dirección, email) y de cada ítem (descripción, precio unitario, subtotal), asegurando que cambios futuros en catálogo o clientes no alteren documentos ya emitidos.
3. **No Afecta Operaciones Reales**: Los presupuestos no descuentan stock, no generan movimientos en arqueo ni registran deuda hasta su aprobación/conversión voluntaria.
4. **Estados Operativos**:
   - `BORRADOR`: En edición.
   - `PENDIENTE`: Entregado al cliente a la espera de respuesta.
   - `APROBADO`: Aceptado por el cliente.
   - `RECHAZADO`: Cancelado o descartado.
   - `EXPIRADO`: Superó la validez comercial.
5. **PDF A4 Vertical Profesional (Réplica Fiel)**:
   - **Encabezado Institucional**: Bloque de marca, logo, RUC, teléfono, correo y ubicación.
   - **Caja de Cotización**: Número de presupuesto y fecha de emisión destacada.
   - **Datos del Cliente**: Bloque ordenado con RUC/CI, teléfono y dirección.
   - **Tabla de Ítems**:
     - Encabezado estilizado en color cian suave (`#D4EEF2`).
     - Columnas: *CANTIDAD*, *DESCRIPCIÓN*, *PRECIO UNITARIO*, *TOTAL*.
     - Formato numérico paraguayo con separadores de miles (ej: `500.000 Gs.`).
   - **Barra de Total**: Bloque gris oscuro (`#6B7280`) con tipografía blanca de alto contraste.
   - **Monto en Letras**: Conversión en español (ej: `DOS MILLONES CIEN MIL GUARANÍES`).
   - **Condiciones Comerciales**: Tiempo de entrega, validez de la oferta y forma de pago.
   - **Firmas**: Bloques alineados para Firma del Cliente y Firma Comercial.
   - **Pie de Página**: Iconos de redes sociales, página web e información de contacto.
   - **Manejo de Varias Páginas**: Repetición automática de encabezados y numeración *Página X de Y*.

---

## ⚡ Guía de Inicio Rápido (Windows)

### Opción 1: Lanzador Automático
Doble clic en el archivo:
```bat
INICIAR_SISTEMA.bat
```
Levantará el backend en el puerto **5000**, el frontend en el puerto **3000** y abrirá tu navegador web predeterminado.

### Opción 2: Inicio Manual

1. **Instalar dependencias y compilar Backend**:
   ```bash
   cd server
   npm install
   npm run build
   npm start
   ```

2. **Iniciar Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

Acceder a: `http://localhost:3000`

---

## 🛠️ API REST de Presupuestos (`/api/quotes`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/quotes` | Lista presupuestos con filtros por búsqueda, estado y fechas |
| `GET` | `/api/quotes/:id` | Obtiene el detalle completo del presupuesto |
| `POST` | `/api/quotes` | Crea un nuevo presupuesto con cálculo seguro de totales |
| `PUT` | `/api/quotes/:id` | Modifica un presupuesto existente |
| `DELETE` | `/api/quotes/:id` | Elimina un presupuesto |
| `PATCH` | `/api/quotes/:id/status` | Cambia el estado (BORRADOR, PENDIENTE, APROBADO, etc.) |
| `POST` | `/api/quotes/:id/duplicate` | Duplica un presupuesto existente con nuevo número |
| `GET` | `/api/quotes/:id/pdf` | Descarga el PDF oficial del presupuesto |
| `POST` | `/api/quotes/preview-pdf` | Genera y transmite el PDF en tiempo real antes de guardar |

---

## 📞 Soporte & Desarrollo
Desarrollado para comercios y tiendas de personalizados en Paraguay.  
Soporte técnico: `0993 277 410` (Ing. Abel Núñez).
