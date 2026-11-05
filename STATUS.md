# STATUS.md - Project Status Tracking

## Project Overview
**Angular1** - Property Management Application with Angular 20 (SSR) + .NET 8 Backend

---

## ✅ COMPLETED MODULES

### 1. Dashboard (`/inicio`) - **COMPLETED**
- **Status**: ✅ Fully implemented
- **Files**: `src/app/inicio/inicio.ts`, `src/app/inicio/inicio.html`, `src/app/inicio/inicio.css`, `src/app/inicio/inicio.spec.ts`
- **Features**: Metrics display, quick access navigation, responsive design
- **Date Completed**: 2026-10-23

### 2. States Module (`/estados`) - **COMPLETED**
- **Status**: ✅ Fully implemented (Frontend + Backend)
- **Frontend Files**: `src/app/estados/estados.ts`, `src/app/estados/estados.html`, `src/app/estados/estados.css`
- **Backend**: API endpoint `GET /api/backend/estados` + Generic CRUD
- **Service**: `src/app/estados.service.ts`
- **Features**: Full CRUD operations, list view, create/edit/delete modals
- **Date Completed**: 2026-10-23

### 3. Payments Module (`/pagos`) - **COMPLETED**
- **Status**: ✅ Fully implemented
- **Files**: `src/app/pagos/pagos.ts`, `src/app/pagos/pagos.html`, `src/app/pagos/pagos.css`
- **Service**: `src/app/pagos.service.ts`
- **Features**: 
  - Tenant selection via dropdown (ID - Name format)
  - Search functionality
  - Edit, delete, and generate invoice capabilities
- **Date Completed**: 2026-10-23

### 4. Angular Build Validation - **COMPLETED**
- **Status**: ✅ Validated successfully
- **Command**: `npm run build`
- **Date Completed**: 2026-10-23

### 5. SSR (Server-Side Rendering) - **COMPLETED**
- **Status**: ✅ Manually tested and working
- **Files**: `src/server.ts`, `src/main.server.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.server.ts`
- **Date Completed**: 2026-10-23

### 6. Authentication System - **COMPLETED**
- **Status**: ✅ Implemented
- **Files**: 
  - `src/app/auth/auth.service.ts` - Authentication logic
  - `src/app/auth/auth.guard.ts` - Route protection
  - `src/app/auth/auth.models.ts` - Auth models
  - `src/app/auth/login/login.ts` - Login component
  - `src/app/auth/perfil/perfil.ts` - Profile component
  - `src/app/auth/has-permission.directive.ts` - Permission directive
  - `src/app/auth/access-pending.ts` - Access pending component

### 10. Username-Based Login (`usuarioSesion`) - **IMPLEMENTED**
- **Status**: ✅ Implemented; ⚠️ Supabase migration deployment must be verified in each environment
- **Files**:
  - `src/app/auth/auth.models.ts` - Added `usuarioSesion?: string` to `Profile` interface
  - `src/app/auth/auth.service.ts` - `iniciarSesion()` resolves email via `get_email_by_username` RPC; `registrarse()` accepts and stores `usuarioSesion`
  - `src/app/auth/login/login.ts` - Login uses `usuarioLogin` field; register uses `usuarioSesion` + `email`
  - `src/app/auth/login/login.html` - Rewritten: login shows "Usuario" field; register shows "Nombre de Usuario" + "Correo Electrónico"
  - `src/app/auth/perfil/perfil.html` - Shows `@usuarioSesion` from profile alongside email
  - `supabase-usuario-sesion-migration.sql` - Migration: ALTER TABLE + unique index + 2 RPCs (`get_email_by_username`, `check_username_available`) + updated `handle_new_user()` trigger
- **Features**:
  - Login by username instead of email (email used only for account validation/recovery)
  - Username uniqueness enforced (case-insensitive) via unique index and `check_username_available` RPC
  - Existing users auto-assigned `usuarioSesion` from their email prefix on migration
  - Register form collects: Nombre Completo, Nombre de Usuario, Correo Electrónico, Contraseña, Teléfono, Empresa
  - Profile page displays `@usuarioSesion`
- **Migration SQL**: `supabase-usuario-sesion-migration.sql` — must be run and verified in both test and production Supabase projects. Username login requires the `get_email_by_username` RPC and a populated `profiles."usuarioSesion"` value.
- **Known diagnostics**: RPC failures now show an actionable migration/configuration error for username lookups. Supabase authentication errors caused by a missing API key now show a configuration/deployment hint; invalid credentials are shown as “Usuario o contraseña incorrectos.”
- **Environment check**: Supabase URL and publishable key are configured in the local production, development, and test environment files. A “No API key found in request” response means the request reaching Supabase did not include its `apikey` header; verify the deployed build and that its environment points to the intended Supabase project.
- **Password recovery**: Login screen includes email-based recovery and a new-password form. The app waits for Supabase's `PASSWORD_RECOVERY` event during callback initialization. Add the deployed `/login` URL to Supabase Auth's allowed redirect URLs for recovery links to return to the application.
- **Date Implemented**: 2026-11-05

### 7. Core Services - **COMPLETED**
- **Supabase Service**: `src/app/supabase.service.ts` - Database integration
- **Tenants Service**: `src/app/inquilinos.service.ts`
- **Properties Service**: `src/app/propiedades.service.ts`
- **Leases Service**: `src/app/alquileres.service.ts`
- **Maintenance Service**: `src/app/mantenimientos.service.ts`
- **Email Service**: `src/app/email.service.ts`
- **Storage Cache Service**: `src/app/storage-cache.service.ts`

### 8. Backend API (.NET 8) - **COMPLETED**
- **Core**: `backend/Program.cs`, `backend/backend.csproj`
- **Controllers**: 
  - `backend/Controllers/BackendController.cs` - Main API controller
  - `backend/Controllers/EmailController.cs` - Email controller
- **Models**: 
  - `backend/Models/AppsScriptSettings.cs`
  - `backend/Models/SmtpSettings.cs`
- **Email Services**: 
  - `backend/EmailServicios/IEmailServicio.cs`
  - `backend/EmailServicios/SmtpEmailServicio.cs`
- **Generic CRUD Endpoints**: inquilinos, propiedades, pagos, mantenimientos, alquileres, estados

### 9. Test Environment & Branching (`test`) - **COMPLETED**
- **Status**: ✅ Fully configured and operational
- **Git Branch**: `test` (published and tracking `origin/test`)
- **Database (Supabase)**: Isolated test project `Alquilados_Test` (`https://jhhujnqmjtdnhkkijafs.supabase.co`)
- **Database Schema**: Full schema executed via `supabase-schema.sql` with default seed data
- **Frontend Configuration**:
  - `src/environments/environment.test.ts` - Test credentials
  - `src/environments/environment.ts` - Configured for test project on `test` branch
  - `angular.json` - Target `test` with automated `fileReplacements`
  - `package.json` - Added scripts `build:test` and `start:test`
- **Hosting / CI/CD**: Automatic Vercel branch preview deployment for `test`
- **Date Completed**: 2026-11-05

---

## 🔄 IN PROGRESS / PARTIALLY IMPLEMENTED

### 1. Tenants Module (`/inquilinos`) - **PARTIAL**
- **Status**: 🔄 Frontend structure exists, needs verification
- **Files**: `src/app/inquilinos/inquilinos.ts`, `src/app/inquilinos/inquilinos.html`, `src/app/inquilinos/inquilinos.css`
- **Service**: `src/app/inquilinos.service.ts` ✅
- **Pending**: Verify full CRUD functionality, UI completeness

### 2. Properties Module (`/propiedades`) - **PARTIAL (Geolocalización agregada)**
- **Status**: 🔄 Frontend structure exists, CRUD and Geolocation implemented
- **Files**: `src/app/propiedades/propiedades.ts`, `src/app/propiedades/propiedades.html`, `src/app/propiedades/propiedades.css`
- **Service**: `src/app/propiedades.service.ts` ✅
- **Features**:
  - Full CRUD operations with Supabase
  - Campos de geolocalización: `latitud` y `longitud`
  - Mini mapa interactivo (Leaflet + OpenStreetMap) con fijación de pin al hacer clic, arrastre de marcador y botón de "Mi ubicación actual"
  - Botón directo para abrir la ubicación en Google Maps (tanto en vista de tarjetas como en tabla)
- **Pending**: Verify full relationships with leases and payments

### 3. Maintenance Module (`/mantenimientos`) - **PARTIAL**
- **Status**: 🔄 Frontend structure exists, needs verification
- **Files**: `src/app/mantenimientos/mantenimientos.ts`, `src/app/mantenimientos/mantenimientos.html`, `src/app/mantenimientos/mantenimientos.css`
- **Service**: `src/app/mantenimientos.service.ts` ✅
- **Pending**: Verify full CRUD functionality, UI completeness

### 4. Leases Module (`/alquileres`) - **PARTIAL**
- **Status**: 🔄 Frontend structure exists, needs verification
- **Files**: `src/app/alquileres/alquileres.ts`, `src/app/alquileres/alquileres.html`, `src/app/alquileres/alquileres.css`
- **Service**: `src/app/alquileres.service.ts` ✅
- **Pending**: Verify full CRUD functionality, UI completeness

---

## ⏳ PENDING MODULES (Not Started / Minimal Structure)

### 1. Emails Module (`/correos`) - **PENDING**
- **Status**: ⏳ Minimal structure only
- **Files**: `src/app/correos/correos.ts`, `src/app/correos/correos.html`, `src/app/correos/correos.css`
- **Backend**: EmailController exists ✅
- **Needed**: Full implementation of email management UI, templates, sending history

### 2. Custom Module (`/custome`) - **PENDING**
- **Status**: ⏳ Minimal structure only
- **Files**: `src/app/custome/custome.ts`, `src/app/custome/custome.html`, `src/app/custome/custome.css`, `src/app/custome/custome.spec.ts`
- **Needed**: Define purpose and implement functionality

### 3. Tests Module (`/pruebas`) - **PENDING**
- **Status**: ⏳ Minimal structure only
- **Files**: `src/app/pruebas/pruebas.ts`, `src/app/pruebas/pruebas.html`, `src/app/pruebas/pruebas.css`, `src/app/pruebas/pruebas.spec.ts`
- **Needed**: Define purpose and implement functionality

### 4. Users Module (`/usuarios`) - **PENDING**
- **Status**: ⏳ Minimal structure only
- **Files**: `src/app/usuarios/usuarios.ts`, `src/app/usuarios/usuarios.html`, `src/app/usuarios/usuarios.css`
- **Needed**: User management UI, roles, permissions integration with auth system

### 5. Companies Module (`/empresas`) - **PENDING**
- **Status**: ⏳ Partial - only admin component
- **Files**: `src/app/empresas/empresas-admin.ts`
- **Needed**: Full company management module

### 6. Search Component - **PENDING**
- **Status**: ⏳ Structure exists
- **Files**: `src/app/search.component/search.component.ts`, `src/app/search.component/search.component.html`, `src/app/search.component/search.component.css`, `src/app/search.component/search.component.spec.ts`
- **Needed**: Integration with modules, global search functionality

### 7. Contar Module (`/contar`) - **PENDING**
- **Status**: ⏳ Structure exists
- **Files**: `src/app/contar/contar.ts`, `src/app/contar/contar.html`, `src/app/contar/contar.css`, `src/app/contar/contar.spec.ts`
- **Needed**: Define purpose and implement functionality

### 8. Datos Module (`/datos`) - **PENDING**
- **Status**: ⏳ Structure exists
- **Files**: `src/app/datos/datos.ts`, `src/app/datos/datos.html`, `src/app/datos/datos.css`, `src/app/datos/datos.spec.ts`
- **Needed**: Define purpose and implement functionality

---

## 📋 PENDING TECHNICAL TASKS

### 1. Comprehensive Error Handling - **PENDING**
- **Priority**: High
- **Scope**: Frontend services, components, backend controllers
- **Details**: Implement consistent error handling patterns, user-friendly error messages, logging

### 2. Unit Tests for Services - **PENDING**
- **Priority**: High
- **Scope**: All services in `src/app/*.service.ts`
- **Details**: Jasmine/Karma tests for Supabase, Auth, Payments, Tenants, Properties, etc.

### 3. API Documentation Generation - **PENDING**
- **Priority**: Medium
- **Scope**: Backend API endpoints
- **Details**: Swagger/OpenAPI documentation for .NET 8 backend

### 4. CI/CD Pipeline Setup - **PENDING**
- **Priority**: Medium
- **Scope**: GitHub Actions / GitLab CI / Azure DevOps
- **Details**: Automated build, test, deploy for both Angular and .NET

### 5. Integration Tests - **PENDING**
- **Priority**: Medium
- **Scope**: End-to-end testing of critical flows
- **Details**: Cypress or Playwright for E2E testing

### 6. Performance Optimization - **PENDING**
- **Priority**: Low
- **Scope**: Bundle size, lazy loading, caching strategies
- **Details**: Analyze and optimize Angular build output

### 7. Accessibility (a11y) Audit - **PENDING**
- **Priority**: Low
- **Scope**: All UI components
- **Details**: WCAG compliance, keyboard navigation, screen reader support

---

## 📊 MODULE STATUS SUMMARY

| Module | Status | Frontend | Backend | Service | Tests |
|--------|--------|----------|---------|---------|-------|
| Dashboard (Inicio) | ✅ Complete | ✅ | N/A | N/A | ✅ Spec exists |
| States (Estados) | ✅ Complete | ✅ | ✅ | ✅ | ❌ |
| Payments (Pagos) | ✅ Complete | ✅ | ✅ | ✅ | ❌ |
| Authentication | ✅ Complete | ✅ | N/A | ✅ | ❌ |
| Test Environment (test) | ✅ Complete | ✅ | ✅ (Supabase Test) | ✅ | ✅ |
| Tenants (Inquilinos) | 🔄 Partial | ✅ | ✅ | ✅ | ❌ |
| Properties (Propiedades) | 🔄 Partial | ✅ | ✅ | ✅ | ❌ |
| Maintenance (Mantenimientos) | 🔄 Partial | ✅ | ✅ | ✅ | ❌ |
| Leases (Alquileres) | 🔄 Partial | ✅ | ✅ | ✅ | ❌ |
| Emails (Correos) | ⏳ Pending | 🔄 Structure | ✅ | ❌ | ❌ |
| Custom (Custome) | ⏳ Pending | 🔄 Structure | ❌ | ❌ | 🔄 Spec exists |
| Tests (Pruebas) | ⏳ Pending | 🔄 Structure | ❌ | ❌ | 🔄 Spec exists |
| Users (Usuarios) | ⏳ Pending | 🔄 Structure | ❌ | ❌ | ❌ |
| Companies (Empresas) | ⏳ Pending | 🔄 Partial | ❌ | ❌ | ❌ |
| Search | ⏳ Pending | 🔄 Structure | ❌ | ❌ | 🔄 Spec exists |
| Contar | ⏳ Pending | 🔄 Structure | ❌ | ❌ | 🔄 Spec exists |
| Datos | ⏳ Pending | 🔄 Structure | ❌ | ❌ | 🔄 Spec exists |

---

## 🗓️ STATUS UPDATE LOG

| Date | Action | Module/Task | Status Change |
|------|--------|-------------|---------------|
| 2026-10-23 | Initial status document created | All | Baseline established |
| 2026-10-23 | Dashboard implemented | Inicio | ✅ Completed |
| 2026-10-23 | States module implemented | Estados | ✅ Completed |
| 2026-10-23 | Payments module implemented | Pagos | ✅ Completed |
| 2026-10-23 | Angular build validated | Build | ✅ Completed |
| 2026-10-23 | SSR tested and working | SSR | ✅ Completed |
| 2026-10-27 | Session expiration set to 30 mins | Auth | 🔄 Refinement |
| 2026-10-29 | Payment invoice printing & receipt improvements | Pagos | 🔄 Refinement |
| 2026-10-31 | Tenant and Lease module updates | Inquilinos / Alquileres | 🔄 Refinement |
| 2026-11-04 | Vercel deployment optimizations | DevOps / Vercel | 🔄 Refinement |
| 2026-11-05 | Test Environment created & validated (Supabase Alquilados_Test, branch test, Vercel preview) | Environments / DevOps | ✅ Completed |
| 2026-11-05 | Geolocation, interactive mini-map & Google Maps links added to properties | Propiedades | 🔄 Feature Added |
| 2026-11-05 | Username-based login (`usuarioSesion`): login by username, register with email for validation, `get_email_by_username` RPC, unique index | Auth | ⚠️ Implemented; Supabase migration deployment requires verification |

---

## 🎯 NEXT PRIORITY ACTIONS

1. **Verify and complete** Tenants, Properties, Maintenance, Leases modules (currently partial)
2. **Implement** Emails module (backend ready, frontend needs work)
3. **Define and implement** Users module (critical for RBAC)
4. **Add unit tests** for all services
5. **Implement comprehensive error handling**
6. **Set up CI/CD pipeline**
7. **Generate API documentation**

---

*Last Updated: 2026-11-05*
*Status Document Version: 1.2*
