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

  // Sincronizar usuario de Supabase con Django
  private async syncWithDjango(supabaseUser: any) {
    try {
      const token = await this.supabaseService.getAccessToken();
      if (token) {
        // Enviar token de Supabase al backend Django para sincronización
        this.apiService.post<AuthResponse>('/auth/supabase-sync/', {
          supabase_token: token,
          user_data: {
            email: supabaseUser.email,
            username: supabaseUser.email.split('@')[0],
            nombre: supabaseUser.user_metadata?.full_name?.split(' ')[0] || '',
            apellido: supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
          }
        }).subscribe({
          next: (response) => this.handleAuthSuccess(response),
          error: (error) => console.error('Error sincronizando con Django:', error)
        });
      }
    } catch (error) {
      console.error('Error obteniendo token de Supabase:', error);
    }
  }

  // Cargar usuario almacenado al inicializar la app
  private loadStoredUser(): Usuario | null {
    try {
      const accessToken = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user_data');

      if (accessToken && userData) {
        const user = JSON.parse(userData);
        this.isAuthenticatedSubject.next(true);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error cargando usuario almacenado:', error);
      this.clearStorage();
      return null;
    }
  }

  // Inicio de sesión con Google
  async loginWithGoogle(): Promise<void> {
    try {
      await this.supabaseService.signInWithGoogle();
      // La sincronización se manejará automáticamente en initializeSupabaseAuth
    } catch (error) {
      console.error('Error en login con Google:', error);
      throw error;
    }
  }

  // Registro de usuario (mantener funcionalidad existente)
  registro(userData: UsuarioRegistro): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/usuarios/registro/', userData)
      .pipe(
        // No llamamos handleAuthSuccess para que no se autentique automáticamente
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
          // console.error('Error en login:', error); // Comentado para evitar logs innecesarios
          // Re-lanzar el error tal como viene del API service sin modificar el mensaje
          throw error;
        })
      );
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        // Intentar logout en el servidor (sin bloquear si falla)
        this.apiService.post('/auth/logout/', { refresh_token: refreshToken }).subscribe({
          next: () => console.log('Logout exitoso en el servidor'),
          error: (error) => {
            // Ignorar errores del servidor durante logout
            // El token puede estar expirado o ser inválido, pero aún así queremos cerrar sesión
            console.log('Token inválido o expirado durante logout (normal):', error.message);
          }
        });
      }
      
      // Cerrar sesión en Supabase
      this.supabaseService.signOut().catch(error => {
        console.error('Error cerrando sesión en Supabase:', error);
      });
      
      // Siempre limpiar el almacenamiento local y redirigir
      this.clearStorage();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error durante logout:', error);
      // Asegurar que siempre se limpie la sesión local
      this.clearStorage();
      this.router.navigate(['/login']);
    }
  }

  // Limpiar almacenamiento
  private clearStorage() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  // Obtener perfil del usuario
  obtenerPerfil(): Observable<any> {
    return this.apiService.get('/auth/perfil/')
      .pipe(
        tap((response: any) => {
          if (response.user) {
            this.currentUserSubject.next(response.user);
            localStorage.setItem('user_data', JSON.stringify(response.user));
          }
        })
      );
  }

  // Actualizar perfil
  actualizarPerfil(userData: Partial<Usuario>): Observable<any> {
    return this.apiService.put('/auth/actualizar-perfil/', userData)
      .pipe(
        tap((response: any) => {
          if (response.user) {
            this.currentUserSubject.next(response.user);
            localStorage.setItem('user_data', JSON.stringify(response.user));
          }
        })
      );
  }

  // Manejar respuesta exitosa de autenticación
  private handleAuthSuccess(response: AuthResponse) {
    const { user, tokens } = response;
    
    // Guardar tokens y datos del usuario
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user_data', JSON.stringify(user));
    
    // Actualizar subjects
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  // Getters
  get currentUserValue(): Usuario | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Verificar rol del usuario
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user ? user.rol === role : false;
  }

  // Verificar si es estudiante
  isEstudiante(): boolean {
    return this.hasRole('Estudiante');
  }

  // Verificar si es docente
  isDocente(): boolean {
    return this.hasRole('Docente');
  }

  // Verificar si es administrador
  isAdministrador(): boolean {
    return this.hasRole('Administrador');
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
}