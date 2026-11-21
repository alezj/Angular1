# Estado actual del proyecto

Fecha de actualización: 2026-09-12

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

- Se añadió una página principal tipo dashboard con métricas de propiedades disponibles, propiedades ocupadas e inquilinos, además de tarjetas de acceso rápido a los módulos más importantes.
- Archivos creados en frontend:
	- `src/app/inicio/inicio.ts` — componente Angular de la página de inicio.
	- `src/app/inicio/inicio.html` — plantilla con el mensaje de bienvenida y las tarjetas.
	- `src/app/inicio/inicio.css` — estilos del panel de inicio.
	- `src/app/inicio/inicio.spec.ts` — prueba básica del componente.
- Se configuró la ruta `{ path: 'inicio', component: Inicio }` y se convirtió en la ruta por defecto del proyecto.
- El dashboard consume los servicios de propiedades e inquilinos para mostrar los totales en tiempo real.
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

### Pagos y facturas

- El formulario de pagos utiliza una lista desplegable de inquilinos con el formato `ID - Nombre`.
- El valor enviado al backend sigue siendo el ID del inquilino.
- La factura se identifica como `Factura #número de pago`.
- La impresión oculta la pantalla de pagos y deja únicamente el comprobante.
- El nombre sugerido del archivo PDF usa el formato `Factura #número.pdf` y el título original de la aplicación se restaura después de imprimir.
- El botón `Compartir` solicita un correo destinatario y envía la factura con formato HTML mediante `POST /api/Email/enviar` usando `ContenidoHtml: true`.

### Corrección de actualización después de carga HTTP

- La configuración global en `src/app/app.config.ts` usa `provideZonelessChangeDetection()`.
- Con este modo, los callbacks de `HttpClient` que actualizan propiedades normales —por ejemplo `cargando`, `error` o los arreglos de datos— no garantizan por sí solos que Angular reprograme la vista.
- Se inyectó `ChangeDetectorRef` y se llamó a `markForCheck()` al finalizar las cargas, tanto exitosas como fallidas, en:
  - `src/app/inicio/inicio.ts`
  - `src/app/datos/datos.ts`
  - `src/app/estados/estados.ts`
  - `src/app/inquilinos/inquilinos.ts`
  - `src/app/pagos/pagos.ts`
  - `src/app/propiedades/propiedades.ts`
  - `src/app/mantenimientos/mantenimientos.ts`
  - `src/app/alquileres/alquileres.ts`
  - `src/app/correos/correos.ts`
- Esto evita que el mensaje “Cargando...” permanezca visible después de recibir la respuesta. Para nuevos componentes, aplicar el mismo patrón o usar señales para todo el estado que cambie de forma asíncrona.
- En `Datos`, `filteredRows` dejó de ser un `computed` que dependía de un arreglo normal; ahora es un método para calcular las filas con los datos recién cargados.

## Validación realizada

- `dotnet build` se ejecutó correctamente después de añadir cada endpoint.
- La compilación de Angular se verificó correctamente con `npm run build` el 2026-09-11.
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
- Ejecutar el frontend y probar visualmente las rutas (`npm.cmd start`).
- Habilitar `estados` en el `doPost` de Apps Script si se desea permitir creación/edición remota desde la aplicación.


## Decisiones y pendientes técnicos

1. Reemplazar los códigos numéricos de estado de propiedades y mantenimientos por etiquetas legibles cuando se defina su significado.
2. Renombrar `fechaPagos` a `diaPago` en Apps Script y Angular.
3. Corregir la generación del ID de alquileres: actualmente puede llegar vacío.
4. Instalar dependencias Angular, ejecutar `npm.cmd run build` y comprobar todas las rutas visualmente.
5. Implementar operaciones de creación, edición y cambio de estado; actualmente los módulos son de consulta.
6. Relacionar pagos con `alquilerID`, además del inquilino, para poder detectar cuotas pendientes.
7. Añadir autenticación antes de usar datos reales.

## Actualización de Sesión (2026-11-05) - Creación del Entorno de Pruebas (Test Environment)

### Objetivo
Establecer un entorno de pruebas aislado de producción para el frontend (Angular 20 SSR), la base de datos (Supabase) y el hosting (Vercel).

### Acciones Realizadas
1. **Rama Git `test`**:
   - Creada y publicada en GitHub (`origin/test`).
2. **Ambiente Supabase de Pruebas**:
   - Proyecto creado: `Alquilados_Test` (`https://jhhujnqmjtdnhkkijafs.supabase.co`).
   - Carga completa de la estructura de tablas y catálogos iniciales mediante `supabase-schema.sql`.
   - Verificación de conectividad y endpoints REST exitosa.
3. **Configuración en Angular**:
   - Archivo `src/environments/environment.test.ts` creado con las credenciales de test.
   - Archivo `src/environments/environment.ts` configurado en la rama `test` para apuntar a la base de pruebas.
   - `angular.json` actualizado con la configuración `"test"` utilizando `fileReplacements`.
   - `package.json` actualizado con los scripts `"build:test"` y `"start:test"`.
   - Compilación exitosa validada mediante `npm run build:test`.
4. **Vercel**:
   - Despliegue automático Preview vinculado a los pushes de la rama `test`.

---

## Referencia para próximas intervenciones

Antes de realizar cambios, revisar `README.md` y este archivo. Mantener ambas referencias actualizadas cuando se modifique arquitectura, rutas, servicios, comportamiento asíncrono, validaciones o pendientes relevantes.

## Skill de documentación

Se solicitó una skill global para actualizar `README.md` y este archivo tras cada cambio. Su creación queda pendiente porque esta PC no tiene un intérprete de Python disponible, necesario para ejecutar la herramienta oficial de creación y validación de skills.


## Actualización de sesión (2026-11-15) — Mantenimiento de notarios

Se revisaron los campos de la certificación de `contrato-template.ts` y se agregó el mantenimiento `/notarios`, con nombre, cédula, matrícula, jurisdicción, despacho y contacto. Se integró la selección del notario y el lugar/fecha del acto en los contratos y su documento imprimible, incluyendo los nombres de todos los comparecientes.

El script `supabase-notarios-schema.sql` se aplicó solo a Alquilados_Test y conserva la separación por usuario/empresa, los permisos y la protección de referencias. Producción queda pendiente para el despliegue. Se comprobaron CRUD, duplicados, asociación por RPC, bloqueo de borrado y aislamiento RLS en una transacción revertida. Pasaron 32 pruebas y la compilación SSR. README y STATUS recogen los detalles y las incidencias previas del entorno de validación.


## Actualización de sesión (2026-11-17) — Kanban de mantenimientos

Se habilitó el arrastre de tarjetas entre columnas con guardado automático del estado, destino resaltado, contadores, indicador de guardado y recuperación individual ante errores. El selector Mover a ofrece una alternativa para móvil y teclado. Los usuarios sin `mantenimientos:manage` conservan acceso de consulta. Se preservan formularios y acciones de mantenimiento con validación y protección ante guardados duplicados.

Se detectó que la vista usaba IDs 1–4 mientras el catálogo de mantenimientos usa 5–8. Las columnas ahora se cargan desde EstadosService; los registros con estados antiguos o desconocidos permanecen visibles. El nuevo método cambiarEstado actualiza solo ese campo, confirma la fila afectada e invalida la caché. No se modificó el esquema ni producción.

Validación: 12 pruebas de lógica, servicio y eventos de arrastre/selector en ChromeHeadless; compilación Angular SSR con 21 rutas prerenderizadas. Se confirmó en una transacción revertida de Alquilados_Test que el cambio de estado conserva descripción y costo. Se mantuvieron los avisos de compilación de tamaño y Leaflet CommonJS. README y STATUS actualizados.


### Corrección del ciclo de renderizado del Kanban (2026-11-17)

Los registros con estados antiguos provocaban `NG0103` (detección de cambios infinita): el getter de columnas construía objetos nuevos y Angular recreaba sus vistas y los controles `NgModel` continuamente. Las columnas y opciones ahora se identifican por el ID del estado mediante `trackBy`. Las pruebas reproducen el error previo y comprueban que los nodos se conservan al repintar, tanto en el tablero como en el formulario. Las 14 pruebas del módulo pasan en ChromeHeadless.

La consulta de diagnóstico también confirmó que `public.notario` aún no existe en producción (`plkbprmponbtwfxglmzm`); la migración de notarios continúa pendiente allí. No se modificó la base de producción. Para desarrollo y pruebas locales usar `npm run start:test` y Alquilados_Test.


## Actualización de sesión (2026-11-17) — Migración de Notarios en producción

Por solicitud expresa del usuario se aplicó `supabase-notarios-schema.sql` al proyecto de producción `alezj's Project` (`plkbprmponbtwfxglmzm`), tras revisar el esquema y confirmar sus dependencias. La migración quedó registrada como `20261117102829_notarios_y_certificacion_contratos`. Se verificaron la tabla notario, los campos de certificación de alquileres, las referencias por empresa, el trigger, las políticas RLS, los permisos y la RPC de guardado. La consulta ordenada por nombre funciona bajo el rol authenticated y se notificó la recarga de esquema a PostgREST. Sin datos de prueba en producción ni nuevos avisos de seguridad sobre los objetos de esta migración. README y STATUS actualizados para cerrar el pendiente del 404.


### Verificación directa de localhost y estabilización adicional (2026-11-17)

Ante la persistencia reportada se inspeccionó la pestaña real de `localhost:4200/mantenimientos`: acumulaba más de 13.000 errores y la consola mostraba fallos de conexión del WebSocket de Vite. Se confirmó por HTTP que los archivos corregidos estaban disponibles, pero la vista abierta no recibía la actualización.

El tablero conserva ahora la referencia del arreglo de columnas cuando no cambia su contenido. El selector de cada tarjeta usa valores y eventos nativos del navegador en lugar de `NgModel`; el formulario mantiene Angular Forms. Se añadió una prueba de carga asíncrona con estado antiguo y veinte ciclos de actualización del catálogo, comprobando que no se crean errores ni se reemplazan los nodos.

Se reinició únicamente el servidor Angular de este proyecto con `CI=true NG_BUILD_MAX_WORKERS=2 npm start -- --hmr=false --host=127.0.0.1 --port=4200`, preservando la configuración de entorno. Verificación final en Chrome: tablero cargado con la solicitud existente y consola sin errores, solo mensajes normales de desarrollo e hidratación. Pasaron las 15 pruebas del módulo y la compilación SSR. No se modificaron datos de mantenimiento durante la comprobación.


## Actualización de sesión (2026-11-21) — Formulario de mantenimientos

Se actualizó el modal de creación/edición con selección de propiedad por código, nombre y dirección, vista previa de la propiedad, descripción de varias líneas, secciones de programación y seguimiento y mensajes de validación por campo. Se agregaron estados de carga/error/reintento del catálogo, validación de fechas reales y costos, preservación de referencias originales no disponibles y protección del formulario mientras guarda. El foco queda dentro del modal y se restituye al cerrar.

La ruta ahora carga Mantenimientos bajo demanda para cumplir el presupuesto inicial de Angular sin ampliarlo. Pasaron 21 pruebas y la compilación SSR. No se modificaron esquema, datos ni los cambios previos del usuario en pagos y configuraciones de entorno. README y STATUS actualizados.
