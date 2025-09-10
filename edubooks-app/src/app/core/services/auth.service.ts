import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
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
    private router: Router
  ) {
    this.loadStoredUser();
  }

  // Cargar usuario almacenado al inicializar la app
  private loadStoredUser() {
    try {
      const accessToken = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user_data');

      if (accessToken && userData) {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }
    } catch (error) {
      console.error('Error cargando usuario almacenado:', error);
      this.clearStorage();
    }
  }

  // Registro de usuario
  registro(userData: UsuarioRegistro): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/auth/registro/', userData)
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
}