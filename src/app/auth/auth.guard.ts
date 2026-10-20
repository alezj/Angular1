import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperar a que Supabase restaure la sesión persistida antes de decidir.
  await authService.esperarInicializacion();

  if (authService.isAuthenticated()) {
    await authService.cargarPerfilYPermisos(authService.currentUser()!.id);
    if (authService.isAuthorized()) return true;
    return router.createUrlTree(['/acceso-pendiente'], {
      queryParams: { estado: authService.approvalStatus() || 'pending' }
    });
  }

  // Redirigir a login con returnUrl
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (_route) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (!authService.isAuthorized()) return router.createUrlTree(['/acceso-pendiente']);

    if (authService.isAdmin() || authService.hasRole(allowedRoles)) {
      return true;
    }

    // Redirigir a inicio si no tiene el rol
    return router.createUrlTree(['/']);
  };
};

export const permissionGuard = (permission: string): CanActivateFn => {
  return (_route) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (!authService.isAuthorized()) return router.createUrlTree(['/acceso-pendiente']);

    if (authService.hasPermission(permission)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
};
