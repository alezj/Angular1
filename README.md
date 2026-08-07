# Angular1

Proyecto Angular con servidor .NET backend.

## Estructura del proyecto

- `src/`: código fuente de la aplicación Angular.
- `public/`: recursos estáticos incluidos en la aplicación.
- `backend/`: proyecto ASP.NET Core Web API con `backend.csproj`.
- `angular.json`: configuración de compilación y SSR para Angular.
- `package.json`: dependencias y scripts de Angular.
- `tsconfig.json`: configuración de TypeScript.
- `README.md`: este archivo.

## Descripción

Este repositorio contiene una aplicación Angular 20 con renderizado del lado del servidor (SSR) y un backend .NET 8.

### Frontend

- Basado en Angular 20.1.x.
- Usa `@angular/build`, `@angular/cli`, `@angular/compiler-cli` y `@angular/ssr`.
- El archivo de entrada principal es `src/main.ts`.
- El servidor SSR se define en `src/server.ts`.

### Backend

- Proyecto .NET 8 en `backend/`.
- Dependencias principales:
    - `Microsoft.AspNetCore.OpenApi`
    - `Swashbuckle.AspNetCore`
- Controladores y modelos se alojan bajo `backend/Controllers` y `backend/Models`.

## Módulos disponibles

- `inquilinos`: `/inquilinos` — consulta de inquilinos.
- `pagos`: `/pagos` — consulta de pagos.
- `propiedades`: `/propiedades` — CRUD de propiedades.
- `mantenimientos`: `/mantenimientos` — consulta y formularios de mantenimiento.
- `alquileres`: `/alquileres` — consulta de contratos/alquileres.
- `estados`: `/estados` — catálogo de estados (nuevo módulo creado).

## Comandos útiles

### Instalar dependencias

```bash
npm install
```

### Iniciar el frontend en desarrollo

```bash
npm start
```

### Construir la aplicación Angular

```bash
npm run build
```

### Ejecutar pruebas unitarias

```bash
npm test
```

### Ejecutar SSR manualmente

```bash
npm run serve:ssr:Angular1
```

### Backend (.NET)

Desde la carpeta `backend/`:

```bash
dotnet build

dotnet run
```

## Estado actual del proyecto

- Se generó el archivo `archivo-generado.md` con un registro de acciones realizadas por el asistente.
- Se añadió la pantalla `Estados` en frontend y el servicio asociado. Los archivos creados son:
    - `src/app/estados/estados.ts`
    - `src/app/estados/estados.html`
    - `src/app/estados/estados.css`
    - `src/app/estados.service.ts`
- Se añadió la ruta `/estados` y el enlace en el menú lateral.
- El backend ya expone `GET /api/backend/estados` y la API genérica está preparada para `create/update/delete` del recurso `estados`.

## Próximos pasos sugeridos

- Reemplazar arrays locales de `estados` en `propiedades` y `mantenimientos` por llamadas al servicio `EstadosService`.
- Instalar dependencias y compilar el frontend para probar la UI en `http://localhost:4200/`.
- Habilitar `estados` en el `doPost` de Apps Script si se desea permitir crear/editar estados desde la app.

## Notas

- Si deseas, puedo actualizar `propiedades.ts` y `mantenimientos.ts` para cargar `estados` desde el backend en lugar de usar valores en memoria.

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
