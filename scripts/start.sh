#!/bin/sh
set -e

echo "========================================="
echo "  V9 Orçamentos — iniciando container"
echo "  DB_TYPE: ${DB_TYPE:-sqlite}"
echo "========================================="

echo ""
echo "==> Inicializando banco master..."
node scripts/init_master_db.cjs

echo ""
echo "==> Iniciando servidor..."
exec tsx server/index.ts
