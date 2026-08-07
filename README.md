# Sistema de gestión de alquileres

Aplicación web para gestionar alquileres. Angular 20 ofrece la interfaz y ASP.NET Core (.NET 8) actúa como puente entre la aplicación y Google Apps Script.

## Arquitectura

```text
Angular (http://localhost:4200)
          |
          v
ASP.NET Core (http://localhost:5129/api/backend/...)
          |
          v
Google Apps Script (?resource=...)
```

Angular nunca consulta Apps Script directamente. El backend centraliza la URL externa, los errores de integración y la política CORS de desarrollo.

## Módulos disponibles

| Módulo | Ruta Angular | Endpoint backend | Recurso Apps Script |
| --- | --- | --- | --- |
| Inquilinos | `/inquilinos` | `GET /api/backend/inquilinos` | `inquilinos` |
| Pagos | `/pagos` | `GET /api/backend/pagos` | `pagos` |
| Propiedades | `/propiedades` | `GET /api/backend/propiedades` | `propiedades` |
| Mantenimientos | `/mantenimientos` | `GET /api/backend/mantenimientos` | `mantenimientos` |
| Alquileres | `/alquileres` | `GET /api/backend/alquileres` | `alquileres` |

Cada módulo incluye una ruta, un enlace en el menú lateral, un servicio HTTP Angular y una tabla con estados de carga, error y lista vacía.

## CRUD de propiedades

La ruta `/propiedades` permite crear, editar y eliminar registros. El backend usa las acciones de Apps Script `create`, `update` y `delete`, enviando `nombre`, `direccion`, `PrecioMensual`, `notas` y `estado`.

El mismo patrón está disponible para `inquilinos`, `pagos`, `mantenimientos` y `alquileres` mediante `POST /api/backend/{recurso}`, `PUT /api/backend/{recurso}/{id}` y `DELETE /api/backend/{recurso}/{id}`. Cada una de esas rutas ya tiene formulario y acciones CRUD en Angular. El cuerpo se reenvía a Apps Script como `data`.

## Datos actuales

- Inquilinos: `id`, `nombreApellido`, `fechaInicioContrato`, `fechaPagos`.
- Pagos: `id`, `idInquilino`, `fechaPago`, `monto`.
- Propiedades: `id`, `nombre`, `direccion`, `estado`, `precioMensual`, `notas`.
- Mantenimientos: `id`, `propiedadID`, `descripcion`, `fecha`, `costo`, `estado`.
- Alquileres: `id`, `propiedadID`, `inquilinoID`, `fechaInicio`, `fechaFin`.

Los estados de propiedades y mantenimientos se muestran actualmente como valores numéricos. Deben sustituirse por etiquetas legibles cuando se defina su catálogo. También se recomienda renombrar `fechaPagos` a `diaPago`, ya que representa el día mensual de cobro.

## Estructura principal

- `src/`: aplicación Angular.
- `src/app/<modulo>/`: componentes y estilos de cada tabla.
- `src/app/<modulo>.service.ts`: servicios Angular que consumen el backend.
- `backend/Controllers/BackendController.cs`: endpoints de integración con Apps Script.
- `backend/appsettings.json`: URL base del despliegue de Apps Script.

## Ejecución local

Instala las dependencias de Angular desde la raíz:

```powershell
npm.cmd install
```

Inicia Angular:

```powershell
npm.cmd start
```

En otra terminal, inicia el backend:

```powershell
Set-Location backend
dotnet run
```

Después abre una de las rutas, por ejemplo `http://localhost:4200/propiedades`.

## Nota sobre npm en este equipo

PowerShell bloquea `npm.ps1`, por lo que se debe usar `npm.cmd`. La instalación también está bloqueada actualmente por el error `SELF_SIGNED_CERT_IN_CHAIN`, asociado a un certificado corporativo/autofirmado. Para resolverlo de forma segura, configura el certificado raíz corporativo en npm mediante `cafile` o la variable `NODE_EXTRA_CA_CERTS`. No se recomienda desactivar `strict-ssl`.

## Configuración y validación

- La URL de Apps Script se configura en `AppsScript:BaseUrl` de `backend/appsettings.json`.
- CORS permite solicitudes de `http://localhost:4200` durante el desarrollo.
- El backend se validó correctamente con:

```powershell
Set-Location backend
dotnet build
```

- La compilación de Angular queda pendiente hasta que las dependencias puedan instalarse:

```powershell
npm.cmd run build
```
