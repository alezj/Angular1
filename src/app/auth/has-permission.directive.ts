import { Directive, effect, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from './auth.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private permission: string | string[] = '';
  private hasView = false;

  @Input() set hasPermission(val: string | string[]) {
    this.permission = val;
    this.updateView();
  }

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authService: AuthService
  ) {
    // Re-evaluar reactivamente cuando cambien los permisos o el rol del usuario
    effect(() => {
      // Registrar dependencia reactiva
      this.authService.permissions();
      this.authService.currentProfile();
      this.updateView();
    });
  }

  private updateView(): void {
    if (!this.permission) {
      this.showView();
      return;
    }

    const perms = Array.isArray(this.permission) ? this.permission : [this.permission];
    const canAccess = perms.some((p) => this.authService.hasPermission(p));

    if (canAccess && !this.hasView) {
      this.showView();
    } else if (!canAccess && this.hasView) {
      this.hideView();
    }
  }

  private showView(): void {
    this.viewContainer.createEmbeddedView(this.templateRef);
    this.hasView = true;
  }

  private hideView(): void {
    this.viewContainer.clear();
    this.hasView = false;
  }
}
