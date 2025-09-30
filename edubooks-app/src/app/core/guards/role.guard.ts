import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        // Obtener roles requeridos de la ruta
        const requiredRoles = route.data['roles'] as string[];
        
        if (!requiredRoles || requiredRoles.length === 0) {
          return true; // No se requieren roles específicos
        }

        // Verificar si el usuario tiene alguno de los roles requeridos
        const hasRequiredRole = requiredRoles.includes(user.rol);
        
        if (!hasRequiredRole) {
          // Redirigir según el rol del usuario
          this.redirectBasedOnRole(user.rol);
          return false;
        }

        return true;
      })
    );
  }

  private redirectBasedOnRole(userRole: string) {
    switch (userRole) {
      case 'administrador':
        this.router.navigate(['/home']);
        break;
      case 'docente':
        this.router.navigate(['/home']);
        break;
      case 'estudiante':
        this.router.navigate(['/home']);
        break;
      default:
        this.router.navigate(['/home']);
    }
  }
}