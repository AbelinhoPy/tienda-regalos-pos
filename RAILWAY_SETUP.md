# 🚂 Configuración Railway para Tienda de Regalos & Personalizados POS

## 📋 Pasos para Configurar Despliegue con PostgreSQL Persistente

### 1. Crear Proyecto en Railway
1. Ingresa a https://railway.app
2. Crea un nuevo proyecto
3. Selecciona "New Project" → "Deploy from GitHub repo"

### 2. Agregar Base de Datos PostgreSQL
1. En tu proyecto Railway, haz clic en "New Service"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará automáticamente una instancia PostgreSQL
4. **Importante**: No configures manualmente `DATABASE_URL` - Railway lo hace automáticamente

### 3. Conectar Repositorio
1. En el mismo proyecto Railway, haz clic en "New Service"
2. Selecciona "GitHub Repo"
3. Conecta tu repositorio de `tienda_de_regalos`
4. Railway detectará automáticamente el archivo `railway.json`

### 4. Verificar Variables de Entorno
Railway configurará automáticamente estas variables:
- ✅ `DATABASE_URL`: Conexión a PostgreSQL ( Railway la genera)
- ✅ `PORT`: 5000 (puedes cambiarlo si es necesario)
- ✅ `NODE_ENV`: production

### 5. Verificar Configuración de Build
El archivo `nixpacks.toml` configurará:
- ✅ Instalación de dependencias (client + server)
- ✅ Build de frontend (Vite)
- ✅ Build de backend (TypeScript)
- ✅ Generación de Prisma Client
- ✅ **Migraciones automáticas** (`prisma migrate deploy` / `prisma db push`)
- ✅ Inicio del servidor


### 6. Primer Despliegue
1. Haz push de los cambios a GitHub
2. Railway detectará el commit automáticamente
3. El build comenzará automáticamente
4. Espera a que finalice el proceso (aprox. 3-5 minutos)
5. La aplicación estará disponible en la URL generada

## 🔍 Verificación del Despliegue

### Ver Logs del Despliegue
1. En Railway, ve a tu servicio de aplicación
2. Haz clic en la pestaña "Logs"
3. Busca estos mensajes de éxito:
   - `✅ Prisma Client generated`
   - `✅ Database migrations applied`
   - `🎁 Tienda de Regalos & Personalizados POS Server running on http://localhost:5000`

### Probar la Base de Datos
1. En Railway, ve al servicio PostgreSQL
2. Haz clic en "Connect" → "Query"
3. Ejecuta: `SELECT * FROM products LIMIT 5;`
4. Deberías ver las tablas creadas correctamente

### Probar la Aplicación
1. Visita la URL generada por Railway
2. La aplicación debería cargar completamente
3. Prueba crear un producto o cliente
4. **Importante**: Los datos deben persistir después de recargar la página

## 🛠️ Troubleshooting

### Error: "Database connection failed"
**Causa**: La variable `DATABASE_URL` no está configurada correctamente
**Solución**:
1. Verifica que tengas un servicio PostgreSQL en el mismo proyecto
2. Ve a la pestaña "Variables" en tu servicio de aplicación
3. Confirma que `DATABASE_URL` esté presente y conectado al servicio PostgreSQL

### Error: "Prisma Client initialization error"
**Causa**: Las migraciones no se ejecutaron correctamente
**Solución**:
1. Ve a la pestaña "Deployments"
2. Revisa los logs para ver si `prisma migrate deploy` falló
3. Si es necesario, haz un redeploy manual

### Error: "Build failed"
**Causa**: Error en el proceso de build
**Solución**:
1. Revisa los logs de build en la pestaña "Deployments"
2. Verifica que las dependencias estén correctamente instaladas
3. Confirma que el archivo `nixpacks.toml` esté correcto

### Los datos se pierden al redeploy
**Causa**: Estás usando SQLite en lugar de PostgreSQL
**Solución**:
1. Confirma que `schema.prisma` tenga `provider = "postgresql"`
2. Verifica que tengas un servicio PostgreSQL configurado
3. Confirma que `DATABASE_URL` esté conectado al servicio PostgreSQL

## 📊 Monitoreo

### Métricas de la Base de Datos
1. Ve al servicio PostgreSQL en Railway
2. Observa:
   - Storage utilizado
   - Conexiones activas
   - Performance queries

### Logs de la Aplicación
1. Ve al servicio de aplicación
2. Pestaña "Logs" para ver:
   - Errores de runtime
   - Solicitudes HTTP
   - Conexiones de base de datos

## 🔄 Actualizaciones Futuras

### Para hacer cambios en el código:
1. Haz los cambios localmente
2. Commit y push a GitHub
3. Railway detectará el cambio automáticamente
4. El nuevo despliegue comenzará
5. Las migraciones se ejecutarán automáticamente si hay cambios en el schema

### Para cambios en el schema de base de datos:
1. Modifica `server/prisma/schema.prisma`
2. Crea una nueva migración: `npx prisma migrate dev --name nombre_migracion`
3. Commit y push
4. Railway ejecutará `prisma migrate deploy` automáticamente

## 💡 Notas Importantes

- **Persistencia de Datos**: Con PostgreSQL en Railway, los datos persisten entre despliegues
- **Backup**: Railway hace backups automáticos de PostgreSQL
- **Escalabilidad**: Puedes actualizar el plan de PostgreSQL según necesites más recursos
- **SSL**: Railway habilita SSL automáticamente para conexiones a la base de datos