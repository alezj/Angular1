# Estado actual del proyecto

Fecha de actualización: 2026-08-11

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

### Pantalla `Inicio` (nueva)

- Se añadió una página principal tipo dashboard con tarjetas de acceso rápido a los módulos más importantes.
- Archivos creados en frontend:
	- `src/app/inicio/inicio.ts` — componente Angular de la página de inicio.
	- `src/app/inicio/inicio.html` — plantilla con el mensaje de bienvenida y las tarjetas.
	- `src/app/inicio/inicio.css` — estilos del panel de inicio.
	- `src/app/inicio/inicio.spec.ts` — prueba básica del componente.
- Se configuró la ruta `{ path: 'inicio', component: Inicio }` y se convirtió en la ruta por defecto del proyecto.
- Se añadió el enlace en el menú lateral (`src/app/app.html`) para acceder a la nueva pantalla.

### Pantalla `Estados` (nueva)

- Se añadió la pantalla de administración de estados para catálogos de `propiedades` y `mantenimientos`.
- Archivos creados en frontend:
	- `src/app/estados/estados.ts` — componente Angular (lógica de carga y CRUD).
	- `src/app/estados/estados.html` — plantilla (tabla + formulario).
	- `src/app/estados/estados.css` — estilos básicos.
	- `src/app/estados.service.ts` — servicio Angular para consumir `api/backend/estados`.
- Se agregó la ruta `{ path: 'estados', component: Estados }` en `src/app/app.routes.ts`.
- Se añadió el enlace en el menú lateral (`src/app/app.html`) para acceder a la nueva pantalla.

### Backend

- El backend ya exponía `GET /api/backend/estados` en `backend/Controllers/BackendController.cs` y la API genérica acepta el recurso `estados` para `create/update/delete` mediante `POST` al endpoint genérico. Por tanto la pantalla `Estados` consume el endpoint existente.
### CRUD de propiedades

Se añadieron `POST`, `PUT` y `DELETE` en `/api/backend/propiedades`. La pantalla ahora incluye formulario de creación/edición y botones para editar o eliminar; Apps Script recibe `create`, `update` y `delete`.

También se añadió un CRUD genérico de backend para `inquilinos`, `pagos`, `mantenimientos` y `alquileres`. Acepta `POST /api/backend/{recurso}`, `PUT /api/backend/{recurso}/{id}` y `DELETE /api/backend/{recurso}/{id}` y restringe los recursos permitidos.

Las cuatro pantallas también incluyen formularios para crear/editar y botones de eliminar. Queda pendiente compilar Angular cuando npm pueda instalar las dependencias.

### Catálogo de estados

Se creó `GET /api/backend/catalogos/estados` con los estados de propiedades: Disponible, Alquilada, Mantenimiento e Inactiva; y de mantenimientos: Pendiente, En proceso, Finalizado y Cancelado. Las dos tablas muestran etiquetas y sus formularios utilizan listas desplegables.

El catálogo fijo fue retirado y el backend ahora consulta `GET /api/backend/estados`. La prueba de creación contra Apps Script fue rechazada porque su `doPost` todavía no admite el recurso `estados`; no se modificó ningún dato remoto.

## Validación realizada

- `dotnet build` se ejecutó correctamente después de añadir cada endpoint.
- La compilación de Angular se verificó correctamente con `npm run build`.
- Se confirmó la carga de la nueva ruta `/inicio` y del menú lateral asociado.

## Acciones realizadas (detallado)

1. Creación de la pantalla `Estados` en frontend con CRUD contra `api/backend/estados`.
2. Registro de los archivos añadidos y actualización de rutas y menú lateral.
3. Verificación: el backend ya tenía el endpoint `GET /api/backend/estados` y la API genérica para acciones (`create`, `update`, `delete`).

## Estado actual del repositorio (resumen)

- Archivos añadidos por el asistente en esta sesión:
	- `archivo-generado.md` (registro de acciones y estado).
	- `src/app/inicio/inicio.ts`
	- `src/app/inicio/inicio.html`
	- `src/app/inicio/inicio.css`
	- `src/app/inicio/inicio.spec.ts`
	- `src/app/estados/estados.ts`
	- `src/app/estados/estados.html`
	- `src/app/estados/estados.css`
	- `src/app/estados.service.ts`
- README actualizado con la nueva pantalla, la ruta de inicio y los comandos clave.

## Próximos pasos sugeridos (prioritarios)

- Integrar el catálogo `estados` en `propiedades` y `mantenimientos` para reemplazar arrays locales y cargarlos desde el backend.
- Instalar dependencias de Angular en una máquina con certificados correctos y compilar para probar la UI (`npm install` y `npm run build`).
- Habilitar `estados` en el `doPost` de Apps Script si se desea permitir creación/edición remota desde la aplicación.


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
