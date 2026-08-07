# Sistema de gestión de alquileres

Aplicación web en Angular 20 con un backend ASP.NET Core (.NET 8). El backend actúa como puente entre la interfaz y una API de Google Apps Script, evitando que Angular consuma directamente el script de Google.

## Funcionalidad disponible

- Consulta de inquilinos desde Google Apps Script.
- Endpoint propio para inquilinos en el backend.
- Vista Angular con tabla de ID, nombre, fecha de inicio de contrato y día de pago.
- Navegación a la pantalla de inquilinos mediante la ruta `/inquilinos`.

## Arquitectura

```text
Angular (http://localhost:4200)
          |
          v
ASP.NET Core (http://localhost:5129/api/backend/inquilinos)
          |
          v
Google Apps Script (?resource=inquilinos)
```

## Estructura principal

- `src/`: aplicación Angular.
- `src/app/inquilinos/`: componente y estilos de la tabla de inquilinos.
- `src/app/inquilinos.service.ts`: servicio Angular que consulta el backend.
- `backend/`: API ASP.NET Core.
- `backend/Controllers/BackendController.cs`: endpoint puente hacia Apps Script.
- `backend/appsettings.json`: URL base de Google Apps Script.

## API disponible

### Obtener inquilinos

```http
GET /api/backend/inquilinos
```

El backend consulta internamente Apps Script usando el recurso `inquilinos` y devuelve su respuesta JSON. El formato esperado es:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombreApellido": "Ana",
      "fechaInicioContrato": "2026-07-12T04:00:00.000Z",
      "fechaPagos": 15
    }
  ]
}
```

`fechaPagos` representa el día mensual de pago. En una siguiente iteración conviene renombrarlo a `diaPago` tanto en Apps Script como en el frontend.

## Ejecución local

Instala las dependencias de Angular desde la raíz del proyecto:

```powershell
npm install
```

Inicia Angular:

```powershell
npm start
```

En otra terminal, inicia el backend:

```powershell
Set-Location backend
dotnet run
```

Abre `http://localhost:4200/inquilinos`.

## Configuración

La URL de despliegue de Apps Script se configura en `backend/appsettings.json`, dentro de `AppsScript:BaseUrl`.

Durante el desarrollo, el backend permite solicitudes CORS desde `http://localhost:4200`.

## Verificación

El backend se compiló correctamente con:

```powershell
Set-Location backend
dotnet build
```

Para comprobar Angular después de instalar dependencias:

```powershell
npm run build
```
