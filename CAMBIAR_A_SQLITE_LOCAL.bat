@echo off
title Cambiar a Base de Datos SQLite (Modo Local Offline)
color 0a

echo ========================================================
echo   CONFIGURANDO BASE DE DATOS LOCAL SQLITE (OFFLINE)
echo   Tienda de Regalos & Personalizados POS
echo ========================================================
echo.

cd /d "%~dp0\server"

echo [1/3] Aplicando esquema Prisma para SQLite...
copy /Y prisma\schema.sqlite.prisma prisma\schema.prisma >nul

echo [2/3] Generando cliente Prisma y sincronizando base de datos local (dev.db)...
cmd /c "node_modules\.bin\prisma.cmd db push --skip-generate"
cmd /c "node_modules\.bin\prisma.cmd generate"

echo [3/3] Configurando variables de entorno...
echo DATABASE_URL="file:./dev.db"> .env
echo PORT=5000>> .env
echo NODE_ENV=development>> .env

echo.
echo ========================================================
echo   CONFIGURACION COMPLETADA!
echo   La aplicacion ahora funciona 100%% offline con SQLite.
echo   Podes iniciar el sistema con INICIAR_SISTEMA.bat
echo ========================================================
pause
