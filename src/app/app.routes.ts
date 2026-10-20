import { Routes } from '@angular/router';
import { Alquileres } from './alquileres/alquileres';
import { authGuard, roleGuard } from './auth/auth.guard';
import { Login } from './auth/login/login';
import { Perfil } from './auth/perfil/perfil';
import { AccessPending } from './auth/access-pending';
import { Contar } from './contar/contar';
import { Correos } from './correos/correos';
import { Custome } from './custome/custome';
import { Datos } from './datos/datos';
import { Estados } from './estados/estados';
import { Inicio } from './inicio/inicio';
import { Inquilinos } from './inquilinos/inquilinos';
import { Mantenimientos } from './mantenimientos/mantenimientos';
import { Pagos } from './pagos/pagos';
import { Propiedades } from './propiedades/propiedades';
import { Pruebas } from './pruebas/pruebas';
import { SearchComponent } from './search.component/search.component';
import { Usuarios } from './usuarios/usuarios';
import { EmpresasAdmin } from './empresas/empresas-admin';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'acceso-pendiente', component: AccessPending },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
  { path: 'usuarios', component: Usuarios, canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'admin/empresas', component: EmpresasAdmin, canActivate: [authGuard, roleGuard(['sysAdmin'])] },
  { path: 'inicio', component: Inicio, canActivate: [authGuard] },
  { path: 'propiedades', component: Propiedades, canActivate: [authGuard] },
  { path: 'inquilinos', component: Inquilinos, canActivate: [authGuard] },
  { path: 'alquileres', component: Alquileres, canActivate: [authGuard] },
  { path: 'pagos', component: Pagos, canActivate: [authGuard] },
  { path: 'mantenimientos', component: Mantenimientos, canActivate: [authGuard] },
  { path: 'estados', component: Estados, canActivate: [authGuard] },
  { path: 'correos', component: Correos, canActivate: [authGuard] },
  { path: 'datos', component: Datos, canActivate: [authGuard] },
  { path: 'pruebas', component: Pruebas, canActivate: [authGuard] },
  { path: 'search', component: SearchComponent, canActivate: [authGuard] },
  { path: 'custom', component: Custome, canActivate: [authGuard] },
  { path: 'contar', component: Contar, canActivate: [authGuard] },
  { path: '**', redirectTo: 'inicio' }
];
