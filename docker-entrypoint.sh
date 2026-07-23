#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

if [ "$RUN_SEED_ON_START" = "true" ]; then
  echo "Ejecutando seed de datos iniciales..."
  npx tsx prisma/seed.ts
fi

echo "Iniciando servidor..."
exec npm run start
