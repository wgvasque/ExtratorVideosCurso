@echo off
REM Script de inicialização rápida da interface web
REM Video Processor Pro

echo.
echo ========================================
echo   Video Processor Pro - Web Interface
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    pip install -r requirements.txt
)

echo [2/3] Iniciando servidor...
echo.
echo Interface disponivel em:
echo   http://localhost:5000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

python app.py
