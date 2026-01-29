@echo off
:: Crear un log para ver si el script arranco
echo Intentando arranque el %date% a las %time% >> C:\Produccion\nexust\log_arranque.txt

cd /d C:\Produccion\nexust

echo Esperando a Docker... >> C:\Produccion\nexust\log_arranque.txt
:loop
docker stats --no-stream >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 5 >nul
    goto loop
)

echo Docker listo. Iniciando contenedores y Supabase... >> C:\Produccion\nexust\log_arranque.txt
docker start nexust-proxy conten-nexust >> C:\Produccion\nexust\log_arranque.txt 2>&1
call npx supabase start >> C:\Produccion\nexust\log_arranque.txt 2>&1

:: CAMBIO: Lanzamos en una ventana aparte para no detener el script
start "" npx supabase functions serve --no-verify-jwt >> C:\Produccion\nexust\log_arranque.txt 2>&1

echo Todo listo. Bloqueando estacion en 10 segundos... >> C:\Produccion\nexust\log_arranque.txt
timeout /t 10

:: COMANDO DE BLOQUEO (Asegúrate de que sea exactamente así)
rundll32.exe user32.dll,LockWorkStation
exit