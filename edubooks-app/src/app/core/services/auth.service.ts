// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
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
    private storage: Storage,
    private router: Router
  ) {
    this.initStorage();
  }

  async initStorage() {
    await this.storage.create();
    await this.loadStoredUser();
  }

  // Cargar usuario almacenado al inicializar la app
  private async loadStoredUser() {
    try {
      const accessToken = await this.storage.get('access_token');
      const userData = await this.storage.get('user_data');

      if (accessToken && userData) {
        this.currentUserSubject.next(userData);
        this.isAuthenticatedSubject.next(true);
        
        // Verificar si el token sigue siendo válido
        this.verificarToken().subscribe({
          error: () => this.logout()
        });
      }
    } catch (error) {
      console.error('Error cargando usuario almacenado:', error);
    }
  }

  // Registro de usuario
  registro(userData: UsuarioRegistro): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/auth/registro/', userData)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
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
          console.error('Error en login:', error);
          throw error;
        })
      );
  }

  // Cerrar sesión
  logout(): Observable<any> {
    return new Observable(observer => {
      // Intentar logout en el servidor
      this.storage.get('refresh_token').then(refreshToken => {
        if (refreshToken) {
          this.apiService.post('/auth/logout/', { refresh_token: refreshToken })
            .subscribe({
              complete: () => {
                this.handleLogoutSuccess();
                observer.next("");
                observer.complete();
              },
              error: () => {
                // Aún si hay error en el servidor, limpiar localmente
                this.handleLogoutSuccess();
                observer.next("");
                observer.complete();
              }
            });
        } else {
          this.handleLogoutSuccess();
          observer.next("");
          observer.complete();
        }
      });
    });
  }

  // Obtener perfil del usuario
  obtenerPerfil(): Observable<any> {
    return this.apiService.get('/auth/perfil/')
      .pipe(
        tap((response: any) => {
          if (response.user) {
            this.currentUserSubject.next(response.user);
            this.storage.set('user_data', response.user);
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
            this.storage.set('user_data', response.user);
          }
        })
      );
  }

  // Verificar si el token es válido
  private verificarToken(): Observable<any> {
    return this.apiService.get('/auth/perfil/');
  }

  // Manejar respuesta exitosa de autenticación
  private async handleAuthSuccess(response: AuthResponse) {
    const { user, tokens } = response;
    
    // Guardar tokens y datos del usuario
    await this.storage.set('access_token', tokens.access);
    await this.storage.set('refresh_token', tokens.refresh);
    await this.storage.set('user_data', user);
    
    // Actualizar subjects
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  // Manejar logout exitoso
  private async handleLogoutSuccess() {
    // Limpiar storage
    await this.storage.remove('access_token');
    await this.storage.remove('refresh_token');
    await this.storage.remove('user_data');
    
    // Actualizar subjects
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Redirigir al login
    this.router.navigate(['/login']);
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