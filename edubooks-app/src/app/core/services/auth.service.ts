import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { SupabaseService } from './supabase.service';
import { Usuario, UsuarioLogin, UsuarioRegistro, AuthResponse } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    this.currentUserSubject = new BehaviorSubject<Usuario | null>(this.loadStoredUser());
    this.currentUser$ = this.currentUserSubject.asObservable();
    // Delay Supabase initialization to avoid NavigatorLockAcquireTimeoutError
    setTimeout(() => {
      this.initializeSupabaseAuth();
    }, 100);
  }

  // Método público para inicializar autenticación
  public initializeAuth() {
    // Este método puede ser llamado desde app.component.ts
    // La inicialización ya se hace automáticamente en el constructor
    console.log('AuthService inicializado');
  }

  // Inicializar autenticación de Supabase
  private initializeSupabaseAuth() {
    this.supabaseService.user$.subscribe((supabaseUser: any) => {
      if (supabaseUser && !this.isAuthenticatedSubject.value) {
        // Usuario autenticado en Supabase pero no en Django
        this.syncWithDjango(supabaseUser);
      }
    });
  }

  private loadStoredUser(): Usuario | null {
    try {
      const userJson = localStorage.getItem('current_user');
      const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
      if (userJson && isAuthenticated) {
        this.isAuthenticatedSubject.next(true);
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.warn('No se pudo cargar usuario almacenado', error);
      return null;
    }
  }

  private handleAuthSuccess(response: AuthResponse) {
    if (response && response.user && response.tokens) {
      localStorage.setItem('access_token', response.tokens.access);
      localStorage.setItem('refresh_token', response.tokens.refresh);
      localStorage.setItem('current_user', JSON.stringify(response.user));
      localStorage.setItem('is_authenticated', 'true');
      this.currentUserSubject.next(response.user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  // Registro de usuario (solo estudiantes)
  registro(userData: UsuarioRegistro): Observable<AuthResponse> {
    // Asegurar rol estudiante siempre
    const payload = { ...userData, rol: 'estudiante' };
    return this.apiService.post<AuthResponse>('/auth/registro/', payload)
      .pipe(
        catchError(error => {
          console.error('Error en registro:', error);
          throw error;
        })
      );
  }

  // Inicio de sesión
  login(credentials: UsuarioLogin): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/auth/login/', credentials)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => {
          // Re-lanzar el error tal como viene del API service sin modificar el mensaje
          throw error;
        })
      );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('is_authenticated');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  // Sincronización con Django usando Supabase
  private syncWithDjango(supabaseUser: any): void {
    try {
      const token = supabaseUser?.id ? null : null; // Placeholder no usado
    } catch (error) {
      console.error('Error al sincronizar con Django:', error);
    }
  }

  // Métodos para el sistema de invitaciones
  validarTokenInvitacion(token: string): Observable<any> {
    return this.apiService.post('/auth/invitaciones/validar-token/', { token });
  }

  registroConInvitacion(userData: any): Observable<any> {
    return this.apiService.post('/auth/invitaciones/registro/', userData)
      .pipe(
        tap((response: any) => {
          if (response.user && response.tokens) {
            this.handleAuthSuccess(response);
          }
        })
      );
  }

  // Métodos para administradores - gestión de invitaciones
  crearInvitacion(invitacionData: any): Observable<any> {
    return this.apiService.post('/auth/invitaciones/crear/', invitacionData);
  }

  listarInvitaciones(filtros?: any): Observable<any> {
    const params = filtros ? new URLSearchParams(filtros).toString() : '';
    return this.apiService.get(`/auth/invitaciones/listar/${params ? '?' + params : ''}`);
  }

  obtenerDetalleInvitacion(token: string): Observable<any> {
    return this.apiService.get(`/auth/invitaciones/detalle/${token}/`);
  }

  cancelarInvitacion(token: string): Observable<any> {
    return this.apiService.post(`/auth/invitaciones/cancelar/${token}/`, {});
  }

  extenderInvitacion(token: string, diasAdicionales: number): Observable<any> {
    return this.apiService.post(`/auth/invitaciones/extender/${token}/`, { 
      dias_adicionales: diasAdicionales 
    });
  }

  reenviarInvitacion(token: string): Observable<any> {
    return this.apiService.post(`/auth/invitaciones/reenviar/${token}/`, {});
  }

  obtenerEstadisticasInvitaciones(): Observable<any> {
    return this.apiService.get('/auth/invitaciones/estadisticas/');
  }

  eliminarInvitacion(token: string): Observable<any> {
    return this.apiService.delete(`/auth/invitaciones/eliminar/${token}/`);
  }
  // Getters de compatibilidad con páginas existentes
  get currentUserValue(): Usuario | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Login con Google (Supabase)
  async loginWithGoogle(): Promise<void> {
    try {
      await this.supabaseService.signInWithGoogle();
      // La sincronización con Django se maneja en initializeSupabaseAuth()
    } catch (error) {
      throw error;
    }
  }
  // Helpers de rol para compatibilidad
  isAdministrador(): boolean {
    const user = this.currentUserSubject.value;
    return user?.rol === 'administrador';
  }

  isDocente(): boolean {
    const user = this.currentUserSubject.value;
    return user?.rol === 'docente';
  }
}