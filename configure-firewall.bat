@echo off
echo Configuration du Firewall Windows pour l'application...
echo.

echo Ajout des regles de firewall pour les ports 3002 et 5173...

:: Règle pour le port 3002 (Backend)
netsh advfirewall firewall add rule name="Gestion Locative - Backend (3002)" dir=in action=allow protocol=TCP localport=3002

:: Règle pour le port 5173 (Frontend Vite)  
netsh advfirewall firewall add rule name="Gestion Locative - Frontend (5173)" dir=in action=allow protocol=TCP localport=5173

echo.
echo ✅ Regles de firewall ajoutees avec succes !
echo.
echo Les ports suivants sont maintenant accessibles depuis le reseau:
echo - Port 3002 (API Backend)
echo - Port 5173 (Interface Web)
echo.
echo Vous pouvez maintenant acceder a l'application depuis d'autres appareils du reseau.
echo.
pause