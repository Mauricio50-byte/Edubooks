import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError, shareReplay } from 'rxjs/operators';
import { SetupService } from '../services/setup.service';

@Injectable({
  providedIn: 'root'
})
export class SystemInitGuard implements CanActivate {
  private systemStatusCache$: Observable<any> | null = null;

  constructor(
    private setupService: SetupService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Usar cache para evitar múltiples llamadas simultáneas
    if (!this.systemStatusCache$) {
      this.systemStatusCache$ = this.setupService.verificarSistema().pipe(
        shareReplay(1),
        catchError(error => {
          const msg = (error && (error.message || error.error?.message)) || 'Error verificando estado del sistema';
          console.warn(msg);
          // En caso de error, asumir que el sistema está inicializado
          return of({ is_initialized: true });
        })
      );
    }

    return this.systemStatusCache$.pipe(
      take(1),
      map(response => {
        // Si el sistema no está inicializado, redirigir a setup
        if (!response.is_initialized) {
          this.router.navigate(['/setup']);
          return false;
        }
        // Si está inicializado, permitir acceso normal
        return true;
      })
    );
  }
}
