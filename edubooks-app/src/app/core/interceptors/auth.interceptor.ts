// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private storage: Storage,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Solo agregar token para requests a nuestra API
    if (request.url.includes('/api/')) {
      this.addTokenHeader(request, next);
    }
    
    return next.handle(request);
  }

  private async addTokenHeader(request: HttpRequest<any>, next: HttpHandler): Promise<Observable<HttpEvent<any>>> {
    const token = await this.storage.get('access_token');
    
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/auth/login/')) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.refreshToken().pipe(
        switchMap((token: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(token);
          
          return next.handle(this.addTokenToRequest(request, token));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.logout();
          return throwError(() => error);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addTokenToRequest(request, token)))
    );
  }

  private refreshToken(): Observable<any> {
    return new Observable(observer => {
      this.storage.get('refresh_token').then(refreshToken => {
        if (refreshToken) {
          // Aquí deberías implementar la llamada para refrescar el token
          // Por simplicidad, manejo el error directamente
          observer.error('Token expired');
        } else {
          observer.error('No refresh token');
        }
      });
    });
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private async logout(): Promise<void> {
    await this.storage.clear();
    this.router.navigate(['/login']);
  }
}