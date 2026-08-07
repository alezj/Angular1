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
- Se creó y actualizó un README con descripción del proyecto, estructura y comandos.

## Notas

- Si necesitas un README más detallado con instrucciones de despliegue o información de API, puedo ampliarlo.
