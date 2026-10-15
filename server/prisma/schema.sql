-- ==========================================================
-- DDL SQL: SISTEMA DE GESTIÓN Y POS PARA BOUTIQUE / TIENDA DE ROPA
-- Soporte: Multimoneda (Gs./R$/US$), Variantes, Deudores y Arqueos
-- Compatible con SQLite / PostgreSQL / MySQL / SQL Server
-- ==========================================================

-- 1. TABLA DE COTIZACIONES DIARIAS
CREATE TABLE IF NOT EXISTS currency_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency VARCHAR(10) NOT NULL, -- 'BRL', 'USD'
    rate_to_gs REAL NOT NULL,      -- Ej: 1350.0 (BRL) o 7500.0 (USD)
    official_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE PRODUCTOS BASE
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE VARIANTES DE PRODUCTO (Talle + Color + Stock)
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL, -- Para lector de barras
    size VARCHAR(20) NOT NULL,            -- P, M, L, XL, 38, etc.
    color VARCHAR(50) NOT NULL,           -- Negro, Blanco, Azul, etc.
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 2,          -- Alerta de reposición
    costo_gs_real REAL DEFAULT 0,         -- Costo unitario real en Gs.
    precio_venta_gs REAL DEFAULT 0,       -- Precio oficial en Gs.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE (product_id, size, color)
);

-- 4. TABLA DE COMPRAS (Con Override de Cotización)
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(150),
    invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency VARCHAR(10) NOT NULL,          -- 'GS', 'BRL', 'USD'
    cotizacion_compra_real REAL DEFAULT 1.0, -- Override manual de cambio
    total_moneda_origen REAL NOT NULL,
    total_gs_real REAL NOT NULL,            -- Calculado en base al override
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. DETALLES DE COMPRA
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    costo_moneda_origen REAL NOT NULL,
    costo_gs_real REAL NOT NULL, -- costo_moneda_origen * cotizacion_compra_real
    margen_ganancia_pct REAL DEFAULT 50.0,
    precio_venta_gs REAL NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- 6. TABLA DE CLIENTES Y LÍMITE DE CRÉDITO
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    document_id VARCHAR(50),      -- CI o RUC
    phone VARCHAR(50),
    email VARCHAR(100),
    credit_limit_gs REAL DEFAULT 0,
    saldo_pendiente_gs REAL DEFAULT 0, -- Balance acumulado en mora/fiado
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE VENTAS (POS)
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INTEGER,
    payment_method VARCHAR(50) NOT NULL, -- CONTADO, CREDITO_FIADO, etc.
    total_venta_gs REAL NOT NULL,
    total_costo_gs_real REAL NOT NULL,
    utilidad_neta_gs REAL NOT NULL,     -- total_venta_gs - total_costo_gs_real
    monto_recibido_gs REAL DEFAULT 0,
    monto_recibido_brl REAL DEFAULT 0,
    monto_recibido_usd REAL DEFAULT 0,
    cotizacion_brl REAL DEFAULT 0,
    cotizacion_usd REAL DEFAULT 0,
    vuelto_gs REAL DEFAULT 0,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 8. DETALLE DE VENTAS
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    precio_unitario_gs REAL NOT NULL,
    costo_unitario_gs REAL NOT NULL,
    subtotal_venta_gs REAL NOT NULL,
    utilidad_item_gs REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- 9. CONTROL DE DEUDAS (CUENTAS POR COBRAR)
CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    sale_id INTEGER UNIQUE,
    monto_original_gs REAL NOT NULL,
    saldo_restante_gs REAL NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, PARCIAL, PAGADO
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

-- 10. ABONOS DE DEUDAS (MULTIMONEDA)
CREATE TABLE IF NOT EXISTS debt_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    debt_id INTEGER,
    currency VARCHAR(10) NOT NULL,      -- 'GS', 'BRL', 'USD'
    rate_applied REAL NOT NULL,         -- Cotización del día aplicada
    amount_paid REAL NOT NULL,          -- Monto en divisa entregada
    amount_applied_gs REAL NOT NULL,    -- Monto descontado al saldo en Gs.
    payment_method VARCHAR(50) NOT NULL,
    notes TEXT,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (debt_id) REFERENCES debts(id)
);

-- 11. ARQUEOS DE CAJA DIARIOS
CREATE TABLE IF NOT EXISTS cash_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_name VARCHAR(100) NOT NULL,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    initial_gs REAL DEFAULT 0,
    initial_brl REAL DEFAULT 0,
    initial_usd REAL DEFAULT 0,
    final_gs REAL,
    final_brl REAL,
    final_usd REAL,
    status VARCHAR(20) DEFAULT 'OPEN',
    notes TEXT
);

-- ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_variant_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
