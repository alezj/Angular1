# Estado actual del proyecto

Fecha de actualización: 2026-08-07

## Objetivo

Desarrollar un sistema web de gestión de alquileres con Angular, ASP.NET Core y Google Apps Script para administrar propiedades, inquilinos, alquileres, pagos y mantenimientos.

## Cambios implementados

### Integración base

1. Se configuró la URL de Google Apps Script en `backend/appsettings.json`.
2. Se habilitó CORS para Angular en `http://localhost:4200`.
3. El backend quedó configurado como intermediario entre Angular y Apps Script.

### Módulos de consulta

| Módulo | Endpoint | Ruta | Campos mostrados |
| --- | --- | --- | --- |
| Inquilinos | `GET /api/backend/inquilinos` | `/inquilinos` | ID, nombre, inicio de contrato, día de pago |
| Pagos | `GET /api/backend/pagos` | `/pagos` | ID, inquilino, fecha, monto |
| Propiedades | `GET /api/backend/propiedades` | `/propiedades` | ID, nombre, dirección, estado, precio, notas |
| Mantenimientos | `GET /api/backend/mantenimientos` | `/mantenimientos` | ID, propiedad, descripción, fecha, costo, estado |
| Alquileres | `GET /api/backend/alquileres` | `/alquileres` | ID, propiedad, inquilino, inicio, finalización |

Para cada módulo se crearon el endpoint .NET, servicio Angular, componente, estilos, ruta y enlace en el menú lateral. Las tablas manejan carga, error y ausencia de registros.

### CRUD de propiedades

Se añadieron `POST`, `PUT` y `DELETE` en `/api/backend/propiedades`. La pantalla ahora incluye formulario de creación/edición y botones para editar o eliminar; Apps Script recibe `create`, `update` y `delete`.

También se añadió un CRUD genérico de backend para `inquilinos`, `pagos`, `mantenimientos` y `alquileres`. Acepta `POST /api/backend/{recurso}`, `PUT /api/backend/{recurso}/{id}` y `DELETE /api/backend/{recurso}/{id}` y restringe los recursos permitidos.

Las cuatro pantallas también incluyen formularios para crear/editar y botones de eliminar. Queda pendiente compilar Angular cuando npm pueda instalar las dependencias.

## Validación realizada

- `dotnet build` se ejecutó correctamente después de añadir cada endpoint.
- La compilación de Angular está pendiente porque las dependencias no están instaladas en esta PC.
- `npm.cmd` funciona, pero `npm.cmd install` falla con `SELF_SIGNED_CERT_IN_CHAIN`; se requiere configurar el certificado corporativo en Node/npm.

## Decisiones y pendientes técnicos

1. Reemplazar los códigos numéricos de estado de propiedades y mantenimientos por etiquetas legibles cuando se defina su significado.
2. Renombrar `fechaPagos` a `diaPago` en Apps Script y Angular.
3. Corregir la generación del ID de alquileres: actualmente puede llegar vacío.
4. Instalar dependencias Angular, ejecutar `npm.cmd run build` y comprobar todas las rutas visualmente.
5. Implementar operaciones de creación, edición y cambio de estado; actualmente los módulos son de consulta.
6. Relacionar pagos con `alquilerID`, además del inquilino, para poder detectar cuotas pendientes.
7. Añadir autenticación antes de usar datos reales.

## Skill de documentación

Se solicitó una skill global para actualizar `README.md` y este archivo tras cada cambio. Su creación queda pendiente porque esta PC no tiene un intérprete de Python disponible, necesario para ejecutar la herramienta oficial de creación y validación de skills.
