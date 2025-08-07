@echo off
echo ====================================
echo    DEMARRAGE APPLICATION RESEAU
echo ====================================
echo.
echo Configuration IP detectee:
echo - Reseau domestique (Wi-Fi): 192.168.1.51
echo - Reseau entreprise (Ethernet): 10.81.234.10
echo.
echo URLs disponibles apres demarrage:
echo - Local: http://localhost:5173
echo - Reseau Wi-Fi: http://192.168.1.51:5173
echo - Reseau Ethernet: http://10.81.234.10:5173
echo.
echo Backend API accessible sur:
echo - Local: http://localhost:3002
echo - Reseau Wi-Fi: http://192.168.1.51:3002
echo - Reseau Ethernet: http://10.81.234.10:3002
echo.
echo ====================================
echo.

echo [1/2] Demarrage du serveur backend...
cd backend
start "Backend Server" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

echo [2/2] Demarrage du serveur frontend...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Application demarree !
echo.
echo Pour arreter l'application, fermez les deux fenetres de commande ouvertes.
echo.
pause