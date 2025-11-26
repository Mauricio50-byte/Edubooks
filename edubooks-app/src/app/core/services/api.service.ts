// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = (localStorage.getItem('api_url') || environment.apiUrl || 'http://localhost:8000/api');

  constructor(private http: HttpClient) {}

  private getHeaders(includeAuth: boolean = true): HttpHeaders {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (includeAuth) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return new HttpHeaders(headers);
  }

  private getHeadersObject(includeAuth: boolean = true): { [key: string]: string } {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    if (includeAuth) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private isNative(): boolean { return Capacitor.getPlatform() !== 'web'; }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = error.error.message;
    } else {
      // Error del lado del servidor
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.error && typeof error.error === 'object') {
        // Parsear errores de DRF (dict con arrays), e.g. {non_field_errors: ["..."]}
        try {
          const entries = Object.entries(error.error as any) as Array<[string, any]>;
          const msgs = entries
            .reduce<string[]>((acc, [, val]) => {
              const arr = Array.isArray(val) ? val : [String(val)];
              arr.forEach(v => { if (v) acc.push(String(v)); });
              return acc;
            }, []);
          if (msgs.length) errorMessage = msgs[0] as string;
        } catch {}
      } else if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica que esté ejecutándose.';
      } else if (error.status === 400 && error.url?.includes('/auth/login/')) {
        // Error específico para login con credenciales inválidas
        errorMessage = 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
      } else if (error.status === 401) {
        errorMessage = 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
      } else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }

    // console.error('Error en API:', error); // Comentado para evitar logs innecesarios
    return throwError(() => ({ message: errorMessage }));
  }

  private handleCapacitorError(endpoint: string, error: any) { return this.handleError(error as any); }

  // Métodos HTTP genéricos
  get<T>(endpoint: string): Observable<T> {
    const isSetupEndpoint = endpoint.startsWith('/setup/');
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders(!isSetupEndpoint) })
      .pipe(catchError(this.handleError));
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    const isSetupEndpoint = endpoint.startsWith('/setup/');
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, { headers: this.getHeaders(!isSetupEndpoint) })
      .pipe(catchError(this.handleError));
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
}
