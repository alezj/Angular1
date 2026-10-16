import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si aún está resolviendo la sesión inicial, esperar un breve momento
  if (authService.cargando()) {
    let intentos = 0;
    while (authService.cargando() && intentos < 20) {
      await new Promise((r) => setTimeout(r, 50));
      intentos++;
    }
  }

  if (authService.isAuthenticated()) {
    return true;
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

    if (authService.hasPermission(permission)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
};
