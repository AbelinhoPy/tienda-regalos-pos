@echo off
title Iniciar Sistema Regalos POS - Tienda de Regalos & Personalizados
color 0d

echo ========================================================
echo   INICIANDO SISTEMA REGALOS POS
echo   Tienda de Regalos, Souvenirs & Personalizados
echo   Modulo de Presupuestos PDF · Multimoneda
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Levantando Servidor Backend (Puerto 5000)...
start "Backend - Regalos POS" cmd /k "cd server && npm start"

timeout /t 3 /nobreak >nul

echo [2/3] Levantando Interfaz Frontend (Puerto 3000)...
start "Frontend - Regalos POS" cmd /k "cd client && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Abriendo navegador en http://localhost:3000...
start http://localhost:3000

echo.
echo ========================================================
echo   SISTEMA ACTIVO!
echo   No cierres las ventanas de comando mientras uses el sistema.
echo ========================================================
pause
