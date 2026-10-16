# 🚀 Guía de Despliegue 100% GRATIS Y PERMANENTE (Cero Costo de por Vida)

Esta arquitectura está especialmente diseñada para vender o entregar el sistema a clientes/amigos con **costo mensual de \$0.00 (sin suscripciones, sin caducidad de prueba y sin requerir tarjeta de crédito)**.

---

## 🏗️ La Arquitectura Gratuita de por Vida

| Componente | Servicio Gratuito | ¿Por qué es gratis para siempre? |
|---|---|---|
| **Base de Datos** | [Neon.tech](https://neon.tech) (PostgreSQL Serverless) | Plan Free permanente: 0.5 GB de almacenamiento (espacio de sobra para miles de productos y presupuestos), nunca vence ni requiere tarjeta. |
| **Backend & Frontend** | [Render.com](https://render.com) (Web Service Node.js) | Plan Free permanente: aloja Express y React en un solo servicio unificado con certificado SSL HTTPS incluido (`.onrender.com`). |
| **Código Fuente** | [GitHub](https://github.com/AbelinhoPy/tienda-regalos-pos) | Repositorio en la nube que actualiza la web automáticamente con cada cambio. |

---

## 📋 Paso 1: Crear la Base de Datos Gratuita en Neon (2 minutos)

1. Ingresa a **[https://neon.tech](https://neon.tech)** y regístrate gratis con tu cuenta de GitHub o Google.
2. Haz clic en **"Create a project"**.
3. Ponle de nombre: `tienda-regalos` (deja la región por defecto o US East).
4. Al crearse, en el dashboard principal verás tu **Connection Details**.
5. Selecciona el modo **"Prisma"** o copia la cadena de conexión que dice:
   ```text
   postgresql://usuario:contraseña@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
6. **¡Guarda esa URL!** Es lo único que necesitarás en el paso 2.

---

## 📋 Paso 2: Desplegar la Aplicación en Render.com (3 minutos)

El repositorio ya incluye el archivo `render.yaml` preconfigurado, por lo que el despliegue es prácticamente en 1 clic:

1. Ingresa a **[https://render.com](https://render.com)** e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"New +"** (arriba a la derecha) y selecciona **"Web Service"**.
3. Selecciona tu repositorio: **`AbelinhoPy/tienda-regalos-pos`**.
4. Completa la ficha básica (o Render la detectará sola):
   - **Name:** `tienda-regalos` (o el nombre del comercio de tu amigo).
   - **Region:** Ohio (US East) o Frankfurt.
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm run build
     ```
   - **Start Command:**
     ```bash
     cd server && npx prisma db push --skip-generate && NODE_ENV=production node dist/server.js
     ```
   - **Instance Type:** Selecciona **Free (\$0/month)**.
5. Baja a la sección **"Environment Variables"** y agrega:
   - **Key:** `DATABASE_URL`
   - **Value:** *(Pega aquí la URL que copiaste de Neon en el Paso 1)*
   - **Key:** `NODE_ENV`
   - **Value:** `production`
6. Haz clic en **"Create Web Service"**.

---

## 📋 Paso 3: Inicializar los Datos Comerciales (Seed)

Una vez que el despliegue en Render termine y veas el mensaje:
`🎁 Tienda de Regalos & Personalizados POS Server running on http://localhost:10000`

Tu amigo o tú pueden ingresar a la URL generada:
👉 **`https://tienda-regalos-xxxx.onrender.com`**

Para poblar la base de datos por primera vez con los productos demo, categorías y el presupuesto modelo de ₲ 2.100.000:
1. En el panel de Render, entra a la pestaña **"Shell"** de tu servicio web.
2. Ejecuta:
   ```bash
   cd server && node dist/seed.js
   ```
3. ¡Listo! La base de datos quedará con todas las categorías de regalos, tasas cambiarias (Gs, R$, US$) y productos listos para vender.

---

## 💡 Ventajas para tu Amigo / Cliente

1. **Cero Mantenimiento Técnico:** No tiene que lidiar con comandos ni servidores locales; accede desde el navegador de su teléfono, tablet o computadora.
2. **Backups Automáticos:** Neon realiza respaldos continuos automáticos en la nube sin costo adicional.
3. **Punto de Venta Móvil:** Puede usar la cámara del celular para escanear productos y emitir presupuestos en PDF desde cualquier lugar.
4. **100% Permanente:** Nunca le llegará una factura sorpresa de fin de mes.
