# Los Manolos ERP

ERP financiero para la gestión de socios, ingresos, gastos, compras, cuentas y resultados.

## Arranque local

1. Copia `.env.example` a `.env`. La configuración apunta al Firebase Realtime Database ya existente.
2. Ejecuta `npm install`.
3. Inicia el entorno: `npm run dev`.

La interfaz incluye un dashboard inicial y módulos de ingresos, gastos, socios, caja/bancos e informes. Los nuevos movimientos se guardan bajo `erp/transactions` y se sincronizan en tiempo real con Firebase.

## Publicación en GitHub Pages

Cada cambio enviado a `main` activa el flujo de GitHub Actions y publica la web en `https://hackalka.github.io/caseta-feria/`.

La primera vez, en GitHub abre **Settings → Pages** y selecciona **GitHub Actions** como origen de publicación.

> Los cálculos fiscales son orientativos y deben revisarse con asesoría profesional.
