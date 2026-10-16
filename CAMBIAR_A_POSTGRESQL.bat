@echo off
title Cambiar a Base de Datos PostgreSQL (Produccion / Railway / Neon)
color 0b

echo ========================================================
echo   CONFIGURANDO BASE DE DATOS POSTGRESQL (CLOUD / RAILWAY)
echo   Tienda de Regalos & Personalizados POS
echo ========================================================
echo.

cd /d "%~dp0\server"

echo [1/3] Restaurando esquema Prisma para PostgreSQL...
copy /Y prisma\schema.postgresql.prisma prisma\schema.prisma >nul

echo [2/3] Generando cliente Prisma para PostgreSQL...
cmd /c "node_modules\.bin\prisma.cmd generate"

echo [3/3] Listo para despliegue o conexion a PostgreSQL.
echo.
echo Recuerda configurar tu variable DATABASE_URL en server/.env o en Railway:
echo DATABASE_URL="postgresql://usuario:password@host:5432/tienda_regalos?sslmode=require"
echo.
echo ========================================================
echo   CONFIGURACION COMPLETADA!
echo ========================================================
pause
