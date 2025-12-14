#!/bin/bash
# Script de inicialização rápida da interface web
# Video Processor Pro

echo ""
echo "========================================"
echo "  Video Processor Pro - Web Interface"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "[1/3] Verificando dependências..."
if ! pip show flask > /dev/null 2>&1; then
    echo "Instalando dependências..."
    pip install -r requirements.txt
fi

echo "[2/3] Iniciando servidor..."
echo ""
echo "Interface disponível em:"
echo "  http://localhost:5000"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

python app.py
