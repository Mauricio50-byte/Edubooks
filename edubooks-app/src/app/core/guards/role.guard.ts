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
          // Redirigir según el rol del usuario a una ruta segura
          this.redirectBasedOnRole(user.rol, state.url);
          return false;
        }

        return true;
      })
    );
  }

  private redirectBasedOnRole(userRole: string, attemptedUrl: string) {
    // Fallbacks más claros por rol para evitar "volver al Home" confuso
    // y proporcionar una sección útil para cada perfil
    const queryParams = { denied: attemptedUrl };

    switch (userRole) {
      case 'administrador':
        // Admin: dashboard principal
        this.router.navigate(['/home'], { queryParams });
        break;
      case 'docente':
        // Docente: enviar a su bibliografía
        this.router.navigate(['/bibliografia'], { queryParams });
        break;
      case 'estudiante':
        // Estudiante: enviar a su bibliografía
        this.router.navigate(['/bibliografia'], { queryParams });
        break;
      default:
        // Rol desconocido: Home como fallback universal
        this.router.navigate(['/home'], { queryParams });
    }
  }
}