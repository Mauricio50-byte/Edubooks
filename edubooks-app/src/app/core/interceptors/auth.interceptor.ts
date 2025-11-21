// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Solo agregar token para requests a nuestra API
    if (request.url.includes('/api/')) {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si recibimos 401 y no estamos en login, redirigir al login
        if (error.status === 401 && !request.url.includes('/auth/login/')) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  private logout(): void {
    try {
      this.authService.logout();
    } catch (_) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
      localStorage.removeItem('is_authenticated');
      this.router.navigate(['/login']);
    }
  }
}
