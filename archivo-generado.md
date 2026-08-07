# Estado actual del proyecto

Fecha de actualización: 2026-08-07

## Objetivo

Construir un sistema web para gestionar alquileres, incluyendo inquilinos, propiedades, contratos y pagos. La solución usa Angular como interfaz, ASP.NET Core como backend y Google Apps Script como acceso a los datos.

## Implementado en esta sesión

1. Se configuró la URL de despliegue de Google Apps Script en `backend/appsettings.json`.
2. Se creó el endpoint `GET /api/backend/inquilinos` en `BackendController`.
   - El endpoint consulta Apps Script con el parámetro `resource=inquilinos`.
   - Reenvía la respuesta JSON de Apps Script al frontend.
3. Se habilitó CORS para `http://localhost:4200` en el backend.
4. Se añadió el servicio Angular `InquilinosService`.
5. Se creó la pantalla Angular `/inquilinos`.
   - Muestra una tabla con ID, nombre y apellido, inicio de contrato y día de pago.
   - Incluye estados de carga, error y lista vacía.
6. Se agregó un enlace "Inquilinos" al menú lateral.

## Estado de la integración

```text
Angular /inquilinos
       ↓
GET http://localhost:5129/api/backend/inquilinos
       ↓
Google Apps Script: ?resource=inquilinos
```

## Validación realizada

- `dotnet build` en `backend/`: compilación completada sin errores ni advertencias.
- La compilación de Angular queda pendiente hasta instalar las dependencias del proyecto con `npm install`.

## Próximos pasos sugeridos

1. Instalar dependencias y comprobar la vista con `npm start`.
2. Crear el endpoint y la vista de propiedades.
3. Crear el flujo de contratos/alquileres, vinculando propiedad e inquilino.
4. Crear pagos vinculados a un alquiler y detectar pagos pendientes.
5. Renombrar el campo `fechaPagos` a `diaPago` para reflejar que almacena el día mensual de cobro.
6. Añadir autenticación antes de manejar datos reales de usuarios.
