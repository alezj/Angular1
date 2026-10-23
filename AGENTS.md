# AGENTS.md - AI Assistant Documentation

## Project Overview

This is an **Angular 20** project with **Server-Side Rendering (SSR)** and a **.NET 8** backend. The project is called "Angular1" and serves as a property management application with modules for managing tenants, properties, payments, maintenance, leases, states, and emails.

## Project Structure

```
Angular1/
├── src/                    # Angular frontend source code
│   ├── app/              # Main application modules
│   ├── assets/           # Static assets
│   └── environments/     # Environment configurations
├── public/                # Static resources
├── backend/              # .NET 8 backend API
├── angular.json          # Angular CLI configuration
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

## Key Files and Their Purposes

### Frontend (Angular)

#### Core Files
- [`src/main.ts`](src/main.ts:1) - Entry point for Angular application
- [`src/server.ts`](src/server.ts:1) - SSR server implementation
- [`src/app/app.config.ts`](src/app/app.config.ts:1) - Angular application configuration
- [`src/app/app.routes.ts`](src/app/app.routes.ts:1) - Application routing configuration

#### Services
- [`src/app/supabase.service.ts`](src/app/supabase.service.ts:1) - Supabase integration service
- [`src/app/auth/auth.service.ts`](src/app/auth/auth.service.ts:1) - Authentication service
- [`src/app/pagos.service.ts`](src/app/pagos.service.ts:1) - Payments service
- [`src/app/inquilinos.service.ts`](src/app/inquilinos.service.ts:1) - Tenants service
- [`src/app/propiedades.service.ts`](src/app/propiedades.service.ts:1) - Properties service

#### Modules
- [`src/app/inicio/`](src/app/inicio/) - Dashboard module
- [`src/app/pagos/`](src/app/pagos/) - Payments module
- [`src/app/inquilinos/`](src/app/inquilinos/) - Tenants module
- [`src/app/propiedades/`](src/app/propiedades/) - Properties module
- [`src/app/mantenimientos/`](src/app/mantenimientos/) - Maintenance module
- [`src/app/alquileres/`](src/app/alquileres/) - Leases module
- [`src/app/estados/`](src/app/estados/) - States module
- [`src/app/correos/`](src/app/correos/) - Emails module

### Backend (.NET 8)

#### Core Files
- [`backend/backend.csproj`](backend/backend.csproj:1) - .NET project file
- [`backend/Program.cs`](backend/Program.cs:1) - Program entry point
- [`backend/Controllers/BackendController.cs`](backend/Controllers/BackendController.cs:1) - Main API controller
- [`backend/Controllers/EmailController.cs`](backend/Controllers/EmailController.cs:1) - Email controller

#### Models
- [`backend/Models/AppsScriptSettings.cs`](backend/Models/AppsScriptSettings.cs:1) - App script settings model
- [`backend/Models/SmtpSettings.cs`](backend/Models/SmtpSettings.cs:1) - SMTP settings model

## Development Workflow

### Initial Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build Angular application**
   ```bash
   npm run build
   ```

3. **Build .NET backend**
   ```bash
   cd backend
   dotnet build
   ```

### Running the Application

#### Development Mode
```bash
npm start
```

#### Build and Serve SSR
```bash
npm run serve:ssr:Angular1
```

#### Run Tests
```bash
npm test
```

#### Backend Development
```bash
cd backend
dotnet run
```

## Common Tasks

### Working with Payments Module

The payments module (`src/app/pagos/`) allows managing tenant payments with:
- Tenant selection via dropdown (ID - Name format)
- Search functionality
- Edit, delete, and generate invoice capabilities

### Authentication

The authentication system uses:
- [`src/app/auth/auth.service.ts`](src/app/auth/auth.service.ts:1) - Authentication logic
- [`src/app/auth/auth.guard.ts`](src/app/auth/auth.guard.ts:1) - Route protection
- [`src/app/auth/login/`](src/app/auth/login/) - Login component

### State Management

States are managed through:
- [`src/app/estados/`](src/app/estados/) - Frontend states module
- Backend API endpoint: `GET /api/backend/estados`
- CRUD operations available via generic API

## Best Practices

### Angular Development

1. **Component Structure**: Each module follows a consistent pattern:
   - `.ts` - Component logic
   - `.html` - Template
   - `.css` - Styles

2. **Service Pattern**: Services are placed in `src/app/` directory with clear naming conventions

3. **Routing**: Use lazy loading for modules to improve performance

### Backend Development

1. **API Design**: RESTful API design with consistent endpoint patterns
2. **Error Handling**: Implement proper error handling in controllers
3. **Validation**: Use model validation for data integrity

## API Documentation

The backend exposes the following key endpoints:

### States API
- `GET /api/backend/estados` - Get all states
- Generic CRUD endpoints available for states resource

### Other Resources
- Generic CRUD endpoints available for: inquilinos, propiedades, pagos, mantenimientos, alquileres

## How to Get Help

### Available Documentation

1. **README.md** - Project overview and setup instructions
2. **AGENTS.md** - This AI assistant documentation
3. **STATUS.md** - Current project status and action tracking (completed, in progress, pending)
4. **archivo-generado.md** - Action log of previous assistant interactions

### Common Issues and Solutions

1. **SSR Issues**: Check `src/server.ts` for proper configuration
2. **Authentication Problems**: Verify `auth.service.ts` and `auth.guard.ts`
3. **API Integration**: Check `supabase.service.ts` for Supabase configuration

## Project Notes

- The project uses **Supabase** for database operations
- **SSR** is implemented for better SEO and performance
- **TypeScript** is used throughout for type safety
- **Angular 20** with latest features and capabilities
- **Tailwind CSS** is used for styling (configured in `src/app/app.css`)

## Current Status (as of 2026-10-23)

- ✅ Dashboard (`/inicio`) implemented with metrics and quick access
- ✅ States module fully implemented with frontend and backend
- ✅ Payments module with tenant selection and invoice generation
- ✅ Angular build validated successfully
- ✅ SSR manually tested and working

> **Note**: For a complete and detailed status tracking, see [`STATUS.md`](STATUS.md:1) which contains:
> - ✅ Completed modules and actions
> - 🔄 Partially implemented modules
> - ⏳ Pending modules
> - 📋 Pending technical tasks
> - 🎯 Next priority actions

## Next Steps for Development

1. Implement remaining modules (correos, custome, pruebas, usuarios)
2. Add comprehensive error handling
3. Implement unit tests for services
4. Add API documentation generation
5. Set up CI/CD pipeline

See [`STATUS.md`](STATUS.md:1) for the current detailed status of each action.

## File Naming Conventions

- **Components**: `module-name.component.ts/html/css`
- **Services**: `service-name.service.ts`
- **Models**: `model-name.ts` or `.cs` for .NET
- **Guards**: `feature-name.guard.ts`
- **Directives**: `feature-name.directive.ts`

## Code Quality Standards

- **TypeScript**: Strict mode enabled
- **Angular**: Follow Angular CLI conventions
- **C#:** .NET 8 best practices
- **Styling**: Prettier configured with 100 character line width
- **Testing**: Jasmine/Karma for unit tests
