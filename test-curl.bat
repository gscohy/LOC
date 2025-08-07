@echo off
echo Test des APIs Dashboard...

echo.
echo 1. Login...
for /f "tokens=*" %%i in ('curl -s -X POST "http://localhost:3002/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\"}"') do set LOGIN_RESPONSE=%%i

echo Response: %LOGIN_RESPONSE%

REM Extract token (simplified - in real script would parse JSON properly)
echo.
echo 2. Test charges stats...
curl -s -X GET "http://localhost:3002/api/charges/stats?annee=2025" -H "Authorization: Bearer your-token-here"

echo.
echo 3. Test loyers stats...
curl -s -X GET "http://localhost:3002/api/loyers/stats" -H "Authorization: Bearer your-token-here"

pause