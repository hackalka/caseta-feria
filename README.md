# Los Manolos ERP

ERP financiero para la gestión de socios, ingresos, gastos, compras, cuentas y resultados.

## Arranque local

1. Copia `.env.example` a `.env` y configura una base de datos PostgreSQL.
2. Ejecuta `npm install`.
3. Genera el cliente: `npm run db:generate`.
4. Aplica el esquema: `npm run db:migrate`.
5. Inicia el entorno: `npm run dev`.

La interfaz incluye un dashboard inicial y módulos de ingresos, gastos, socios, caja/bancos e informes. El esquema Prisma incorpora roles, trazabilidad y modelos normalizados para el resto de operaciones.

> Los cálculos fiscales son orientativos y deben revisarse con asesoría profesional.
