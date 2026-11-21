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

- `inicio`: `/inicio` — página principal con dashboard, métricas de propiedades e inquilinos y accesos rápidos.
- `inquilinos`: `/inquilinos` — consulta de inquilinos.
- `correos`: `/correos` — envío de correos a inquilinos con correo registrado.
- `pagos`: `/pagos` — gestión de pagos con selector de inquilino, búsqueda, edición, eliminación y generación de facturas.
- `propiedades`: `/propiedades` — CRUD de propiedades.
- `mantenimientos`: `/mantenimientos` — tablero Kanban con arrastre entre estados, guardado automático y formularios.
- `alquileres`: `/alquileres` — consulta de contratos/alquileres.
- `estados`: `/estados` — catálogo de estados.

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
- Se añadió la pantalla `Inicio` como landing page del sistema, con métricas de propiedades disponibles, propiedades ocupadas e inquilinos, además de tarjetas de acceso a los módulos principales.
- Se incorporó la ruta `/inicio` y su enlace en el menú lateral.
- Se añadió la pantalla `Estados` en frontend y el servicio asociado. Los archivos creados son:
    - `src/app/estados/estados.ts`
    - `src/app/estados/estados.html`
    - `src/app/estados/estados.css`
    - `src/app/estados.service.ts`
- Se añadió la ruta `/estados` y el enlace en el menú lateral.
- El backend ya expone `GET /api/backend/estados` y la API genérica está preparada para `create/update/delete` del recurso `estados`.
- La compilación de Angular se validó correctamente con `npm run build`.
- La pantalla de pagos permite seleccionar el inquilino mediante una lista con formato `ID - Nombre`.
- Las facturas muestran el formato `Factura #número`, se imprimen sin el resto de la pantalla de pagos y el nombre sugerido del PDF usa ese mismo número.
- Desde la factura se puede indicar un destinatario y enviarla por correo mediante el servicio SMTP configurado. El mensaje se envía con formato HTML y estilos propios de la factura.
- Se corrigió la actualización de las vistas después de solicitudes HTTP. La aplicación utiliza `provideZonelessChangeDetection()`, por lo que los componentes que modifican propiedades convencionales tras una respuesta HTTP deben llamar a `ChangeDetectorRef.markForCheck()` para programar el repintado.
- La corrección se aplicó a Inicio, Datos, Estados, Inquilinos, Pagos, Propiedades, Mantenimientos, Alquileres y Correos. La pantalla Datos también calcula el filtrado en cada detección de cambios para no retener una lista vacía previa a la carga.
- La compilación se validó con `npm run build` el 2026-09-11 después de esta corrección.

## Próximos pasos sugeridos

- Reemplazar arrays locales de `estados` en `propiedades` por llamadas al servicio `EstadosService`.
- Ejecutar el frontend y probar la UI en `http://localhost:4200/`.
- Habilitar `estados` en el `doPost` de Apps Script si se desea permitir crear/editar estados desde la app.

## Notas

- Pendiente cargar los estados de `propiedades.ts` desde el catálogo. Mantenimientos ya utiliza `EstadosService`.
- Antes de modificar el proyecto en una próxima sesión, consultar este archivo y `archivo-generado.md`: ambos mantienen las decisiones técnicas, cambios aplicados y pendientes conocidos.

### Actualizaciones HTTP con detección zoneless

`src/app/app.config.ts` habilita `provideZonelessChangeDetection()`. No se debe asumir que una mutación realizada en el callback de `HttpClient` actualizará automáticamente la plantilla si el estado se guarda en propiedades normales. Después de cambiar datos, errores o indicadores como `cargando` en dichos callbacks, usar `this.cdr.markForCheck()` (inyectando `ChangeDetectorRef`) o migrar ese estado completo a señales.

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

- La compilación de Angular se ejecuta con:

```powershell
npm.cmd run build
```


### Notarios y certificación de contratos (2026-11-15)

- El menú **Notarios** (`/notarios`) permite crear, buscar, editar y eliminar notarios con nombre completo, cédula, matrícula, jurisdicción, dirección del despacho, teléfono y correo. Los cinco primeros datos son obligatorios; teléfono y correo son opcionales.
- Usa los permisos existentes `alquileres:read/create/update/delete` para el catálogo. La ruta carga el módulo bajo demanda.
- En **Contratos**, selecciona el notario e indica el lugar y la fecha de certificación del acto, independientes del lugar y fecha de firma. La certificación impresa incorpora sus datos y los nombres del propietario, inquilino y garantes. Los contratos anteriores pueden continuar sin notario asignado y muestran campos pendientes.
- Ejecutar `supabase-notarios-schema.sql` después de `supabase-alquileres-depositos-firma-schema.sql` antes de desplegar esta versión. Aplicado y verificado en **Alquilados_Test** (`jhhujnqmjtdnhkkijafs`) y en producción **alezj's Project** (`plkbprmponbtwfxglmzm`, migración `20261117102829_notarios_y_certificacion_contratos`, 2026-11-17). Mantiene RLS por usuario en el esquema de prueba y por empresa/permisos en el esquema multitenant. Impide eliminar notarios con contratos asociados.
- Validación: compilación de prueba con SSR y 21 rutas prerenderizadas, 32 pruebas de notarios/contratos y verificación SQL transaccional de CRUD, duplicados, RPC, claves foráneas y aislamiento RLS. Los datos temporales de verificación se revirtieron.
- En este equipo la caché nativa LMDB aborta al compilar: `CI=true NG_BUILD_MAX_WORKERS=2 npm run build:test` permite validar sin esa caché. La suite global tiene un error previo en `src/app/datos.spec.ts` (importa `Datos` desde un módulo que no lo exporta); se ejecutaron los tres archivos de pruebas de notarios y contratos con una configuración temporal limitada a ellos.


### Tablero Kanban de mantenimientos (2026-11-17)

- Arrastra una tarjeta entre columnas para cambiar su estado. El selector **Mover a** permite el mismo cambio desde móvil o teclado.
- El tablero actualiza la tarjeta y los contadores al mover, señala el destino y muestra el guardado. Cada tarjeta se bloquea mientras se confirma su movimiento. Ante un error restaura esa tarjeta y conserva visible el tablero y los movimientos de otras solicitudes.
- `MantenimientosService.cambiarEstado()` actualiza únicamente `estado`, requiere que la API devuelva la fila e invalida la caché tras confirmar. La gestión requiere `mantenimientos:manage`; los usuarios de consulta ven el avance sin controles de escritura.
- Las columnas se cargan desde `EstadosService`, filtrando el catálogo de mantenimientos. Si el catálogo no está disponible, se usan los estados estándar 5–8 verificados en Alquilados_Test. Las solicitudes con estados antiguos o desconocidos aparecen en columnas adicionales para poder trasladarlas a un estado del catálogo.
- No requiere migración ni dependencias adicionales. Validación: 12 pruebas de lógica, persistencia e interacción en ChromeHeadless; compilación Angular SSR con 21 rutas prerenderizadas y comprobación transaccional del cambio de estado en Alquilados_Test (datos temporales revertidos). Se usó una configuración temporal de pruebas limitada al módulo por el error previo de importación de la suite global descrito arriba.


### Corrección del ciclo de renderizado del Kanban (2026-11-17)

Los registros con estados antiguos provocaban `NG0103` (detección de cambios infinita): el getter de columnas construía objetos nuevos y Angular recreaba sus vistas y los controles `NgModel` continuamente. Las columnas y opciones ahora se identifican por el ID del estado mediante `trackBy`. Las pruebas reproducen el error previo y comprueban que los nodos se conservan al repintar, tanto en el tablero como en el formulario. Las 14 pruebas del módulo pasan en ChromeHeadless.

El diagnóstico inicial confirmó la ausencia de `public.notario` en producción (`plkbprmponbtwfxglmzm`). La migración pendiente se aplicó posteriormente el 2026-11-17 por solicitud expresa del usuario. Para desarrollo y pruebas locales usar `npm run start:test` y Alquilados_Test.


### Migración de Notarios en producción (2026-11-17)

Aplicada `20261117102829_notarios_y_certificacion_contratos` en `plkbprmponbtwfxglmzm` desde `supabase-notarios-schema.sql`. Se verificaron la tabla, los tres campos de certificación en alquileres, las claves foráneas por empresa, el trigger de asignación de empresa, las cuatro políticas RLS y la extensión de la RPC de contratos. La consulta ordenada por nombre se ejecutó con el rol `authenticated`; se notificó a PostgREST para recargar el esquema. La revisión de seguridad no reportó avisos sobre la tabla ni sobre la RPC modificada. No se crearon datos de prueba en producción.


### Verificación directa de localhost y estabilización adicional (2026-11-17)

Ante la persistencia reportada se inspeccionó la pestaña real de `localhost:4200/mantenimientos`: acumulaba más de 13.000 errores y la consola mostraba fallos de conexión del WebSocket de Vite. Se confirmó por HTTP que los archivos corregidos estaban disponibles, pero la vista abierta no recibía la actualización.

El tablero conserva ahora la referencia del arreglo de columnas cuando no cambia su contenido. El selector de cada tarjeta usa valores y eventos nativos del navegador en lugar de `NgModel`; el formulario mantiene Angular Forms. Se añadió una prueba de carga asíncrona con estado antiguo y veinte ciclos de actualización del catálogo, comprobando que no se crean errores ni se reemplazan los nodos.

Se reinició únicamente el servidor Angular de este proyecto con `CI=true NG_BUILD_MAX_WORKERS=2 npm start -- --hmr=false --host=127.0.0.1 --port=4200`, preservando la configuración de entorno. Verificación final en Chrome: tablero cargado con la solicitud existente y consola sin errores, solo mensajes normales de desarrollo e hidratación. Pasaron las 15 pruebas del módulo y la compilación SSR. No se modificaron datos de mantenimiento durante la comprobación.


### Formulario de mantenimientos (2026-11-21)

La creación y edición usan un modal adaptable con secciones de propiedad, detalles y seguimiento. La propiedad se elige desde el catálogo por código/nombre/dirección, con una vista de la dirección seleccionada; la carga tiene estados de espera, vacío, error y reintento. La descripción admite varias líneas y hasta 2,000 caracteres. La fecha inicial corresponde al día actual de Santo Domingo; el costo admite cero y hasta dos decimales. Los errores aparecen junto al campo y el formulario conserva sus valores si falla el guardado.

Al editar se puede mantener la propiedad o estado original aunque no figuren en el catálogo. Durante el guardado se bloquean controles y cierre; el foco permanece dentro del diálogo y vuelve al control de origen al cerrar. La ruta de Mantenimientos carga el componente bajo demanda para respetar el presupuesto de tamaño inicial. Validación: 21 pruebas del módulo satisfactorias en ChromeHeadless y compilación Angular SSR con 21 rutas prerenderizadas. No requiere migración.
