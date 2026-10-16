import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = signal('Nexus CRM');
  isMenuOpen = signal(false);
  isLoginRoute = signal(false);

  constructor(
    public readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.isLoginRoute.set(this.router.url.split('?')[0] === '/login');
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isLoginRoute.set(event.urlAfterRedirects.split('?')[0] === '/login');
        this.closeMenu();
      });
  }

  toggleMenu(): void {
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
