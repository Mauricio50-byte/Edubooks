import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface UsuarioAdmin {
  id: number;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  rol: 'Estudiante' | 'Docente' | 'Administrador';
  genero?: 'M' | 'F' | 'O' | 'N';
  is_active: boolean;
  fecha_registro: string;
  ultimo_acceso?: string;
  carrera?: string;
  matricula?: string;
  departamento?: string;
  numero_empleado?: string;
  area?: string;
}

export interface EstadisticasUsuarios {
  total_usuarios: number;
  usuarios_activos: number;
  usuarios_inactivos: number;
  por_rol: {
    estudiantes: number;
    docentes: number;
    administradores: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  /**
   * Obtener lista de usuarios (solo para administradores)
   */
  getUsuarios(filtros?: any): Observable<UsuarioAdmin[]> {
    const params = new URLSearchParams();
    
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params.append(key, filtros[key]);
        }
      });
    }
    
    const queryString = params.toString();
    const endpoint = queryString ? `/auth/admin/usuarios/?${queryString}` : '/auth/admin/usuarios/';
    
    return this.apiService.get<{results: UsuarioAdmin[]}>(endpoint)
      .pipe(
        map(response => response.results || response as any),
        catchError(error => {
          console.error('Error obteniendo usuarios:', error);
          // No mostrar datos simulados, devolver array vacío
          return throwError(error);
        })
      );
  }

  /**
   * Cambiar estado de un usuario (activar/desactivar)
   */
  cambiarEstadoUsuario(usuarioId: number, nuevoEstado: boolean): Observable<any> {
    return this.apiService.post(`/auth/admin/usuarios/${usuarioId}/estado/`, { activo: nuevoEstado })
      .pipe(
        catchError(error => {
          console.error('Error cambiando estado del usuario:', error);
          return throwError(error);
        })
      );
  }

  /**
   * Obtener estadísticas de usuarios
   */
  getEstadisticasUsuarios(): Observable<EstadisticasUsuarios> {
    return this.apiService.get<EstadisticasUsuarios>('/auth/admin/estadisticas/')
      .pipe(
        catchError(error => {
          console.error('Error obteniendo estadísticas:', error);
          return throwError(error);
        })
      );
  }

  actualizarPerfil(datos: any): Observable<any> {
    return this.apiService.put('/auth/usuarios/me/', datos)
      .pipe(
        map((usuarioActualizado: any) => {
          this.authService.updateCurrentUser(usuarioActualizado);
          return usuarioActualizado;
        }),
        catchError(error => {
          console.error('Error actualizando perfil:', error);
          return throwError(error);
        })
      );
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<any> {
    const payload = {
      password_actual: passwordActual,
      password_nueva: passwordNueva
    };
    return this.apiService.post('/auth/usuarios/me/password/', payload)
      .pipe(
        catchError(error => {
          console.error('Error cambiando contraseña:', error);
          return throwError(error);
        })
      );
  }

  obtenerPerfil(): Observable<any> {
    return this.apiService.get('/auth/usuarios/me/')
      .pipe(
        map((usuario: any) => {
          this.authService.updateCurrentUser(usuario);
          return usuario;
        }),
        catchError(error => {
          console.error('Error obteniendo perfil:', error);
          return throwError(error);
        })
      );
  }
}
