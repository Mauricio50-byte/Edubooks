// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { Http as CapacitorHttp } from '@capacitor/http';

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

  private isNative(): boolean {
    return Capacitor.getPlatform() !== 'web';
  }

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

  private handleCapacitorError(endpoint: string, error: any) {
    let errorMessage = 'Ocurrió un error desconocido';
    const status = error?.status ?? 0;
    const detail = error?.data?.detail || error?.data?.message || error?.error || error?.message;
    if (detail) {
      errorMessage = detail;
    } else if (status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica que esté ejecutándose.';
    } else if (status === 400 && endpoint.includes('/auth/login/')) {
      errorMessage = 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
    } else if (status === 401) {
      errorMessage = 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
    } else if (status) {
      errorMessage = `Error ${status}: ${error?.message || 'Error de solicitud'}`;
    }
    return throwError(() => ({ message: errorMessage }));
  }

  // Métodos HTTP genéricos
  get<T>(endpoint: string): Observable<T> {
    const isSetupEndpoint = endpoint.startsWith('/setup/');
    if (this.isNative()) {
      return from(CapacitorHttp.request({
        method: 'GET',
        url: `${this.baseUrl}${endpoint}`,
        headers: this.getHeadersObject(!isSetupEndpoint)
      })).pipe(
        map((res: any) => res?.data as T),
        catchError(err => this.handleCapacitorError(endpoint, err))
      );
    }
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(!isSetupEndpoint)
    }).pipe(
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    const isSetupEndpoint = endpoint.startsWith('/setup/');
    if (this.isNative()) {
      return from(CapacitorHttp.request({
        method: 'POST',
        url: `${this.baseUrl}${endpoint}`,
        headers: this.getHeadersObject(!isSetupEndpoint),
        data
      })).pipe(
        map((res: any) => res?.data as T),
        catchError(err => this.handleCapacitorError(endpoint, err))
      );
    }
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders(!isSetupEndpoint)
    }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    if (this.isNative()) {
      return from(CapacitorHttp.request({
        method: 'PUT',
        url: `${this.baseUrl}${endpoint}`,
        headers: this.getHeadersObject(true),
        data
      })).pipe(
        map((res: any) => res?.data as T),
        catchError(err => this.handleCapacitorError(endpoint, err))
      );
    }
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    if (this.isNative()) {
      return from(CapacitorHttp.request({
        method: 'DELETE',
        url: `${this.baseUrl}${endpoint}`,
        headers: this.getHeadersObject(true)
      })).pipe(
        map((res: any) => res?.data as T),
        catchError(err => this.handleCapacitorError(endpoint, err))
      );
    }
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }
}