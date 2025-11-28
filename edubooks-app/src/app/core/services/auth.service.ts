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
    const payload = this.sanitizeUserPayload({ ...userData, rol: 'estudiante' });
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
  private async syncWithDjango(supabaseUser: any): Promise<void> {
    try {
      const supabaseToken = await this.supabaseService.getAccessToken();
      if (!supabaseToken) {
        return;
      }
      const payload = {
        supabase_token: supabaseToken,
        user_data: {
          username: supabaseUser?.email?.split('@')[0] || '',
          nombre: supabaseUser?.user_metadata?.nombre || '',
          apellido: supabaseUser?.user_metadata?.apellido || ''
        }
      };
      this.apiService.post<AuthResponse>('/auth/supabase-sync/', payload)
        .pipe(
          tap(response => this.handleAuthSuccess(response)),
          catchError(error => { throw error; })
        )
        .subscribe();
    } catch (error) {
      console.error('Error al sincronizar con Django:', error);
    }
  }

  // Métodos para el sistema de invitaciones
  validarTokenInvitacion(token: string): Observable<any> {
    const normalized = (token || '').toString().trim();
    return this.apiService.post('/auth/invitaciones/validar-token/', { token: normalized });
  }

  registroConInvitacion(userData: any): Observable<any> {
    const payload = this.sanitizeUserPayload({ ...userData, token_invitacion: (userData?.token_invitacion || '').toString().trim() });
    return this.apiService.post('/auth/invitaciones/registro/', payload)
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
  updateCurrentUser(user: Usuario): void {
    try {
      localStorage.setItem('current_user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch {}
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

  private sanitizeUserPayload(data: any): any {
    const allowedTop = [
      'email','username','nombre','apellido','rol','password','password_confirm',
      'telefono','numero_identificacion','genero',
      'notificaciones_email','notificaciones_push','idioma_preferido',
      'token_invitacion','token'
    ];
    const out: any = {};
    const setVal = (obj: any, k: string, v: any) => { obj[k] = typeof v === 'string' ? v.trim() : v; };
    allowedTop.forEach(k => { if (data[k] !== undefined) setVal(out, k, data[k]); });
    out.rol = String(out.rol || '').toLowerCase() || 'estudiante';

    const clean = (obj: any, allowed: string[]) => {
      const res: any = {};
      allowed.forEach(k => { if (obj && obj[k] !== undefined) setVal(res, k, obj[k]); });
      return res;
    };

    const allowedEst = ['carrera','matricula','semestre_actual','grado','seccion'];
    const allowedDoc = ['departamento','numero_empleado','especialidad','codigo_empleado'];
    const allowedAdm = ['area','nivel_acceso','fecha_nombramiento','cargo'];

    if (data.datos_estudiante) {
      const e = clean(data.datos_estudiante, allowedEst);
      if (Object.keys(e).length) out.datos_estudiante = e;
    }
    if (data.datos_docente) {
      const d = clean(data.datos_docente, allowedDoc);
      if (d.numero_empleado && !d.codigo_empleado) d.codigo_empleado = d.numero_empleado;
      if (Object.keys(d).length) out.datos_docente = d;
    }
    if (data.datos_administrador) {
      const a = clean(data.datos_administrador, allowedAdm);
      if (Object.keys(a).length) out.datos_administrador = a;
    }

    return out;
  }
}
