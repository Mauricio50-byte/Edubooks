import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { SetupService } from '../services/setup.service';

@Injectable({
  providedIn: 'root'
})
export class SetupGuard implements CanActivate {

  constructor(
    private setupService: SetupService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.setupService.verificarSistema().pipe(
      take(1),
      map(response => {
        // Si el sistema ya está inicializado, redirigir al login
        if (response.is_initialized) {
          this.router.navigate(['/login']);
          return false;
        }
        // Si no está inicializado, permitir acceso a setup
        return true;
      })
    );
  }
}