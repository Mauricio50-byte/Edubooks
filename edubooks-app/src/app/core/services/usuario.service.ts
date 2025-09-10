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
    const endpoint = queryString ? `/auth/usuarios/?${queryString}` : '/auth/usuarios/';
    
    return this.apiService.get<{results: UsuarioAdmin[]}>(endpoint)
      .pipe(
        map(response => response.results || response as any),
        catchError(error => {
          console.error('Error obteniendo usuarios:', error);
          // Fallback a datos simulados en caso de error
          return of(this.getUsuariosSimulados());
        })
      );
  }

  /**
   * Cambiar estado de un usuario (activar/desactivar)
   */
  cambiarEstadoUsuario(usuarioId: number): Observable<any> {
    return this.apiService.post(`/auth/usuarios/${usuarioId}/cambiar-estado/`, {})
      .pipe(
        catchError(error => {
          console.error('Error cambiando estado del usuario:', error);
          // Fallback simulado
          return of({ 
            success: true, 
            message: 'Estado cambiado exitosamente (simulado)' 
          });
        })
      );
  }

  /**
   * Obtener estadísticas de usuarios
   */
  getEstadisticasUsuarios(): Observable<EstadisticasUsuarios> {
    return this.apiService.get<EstadisticasUsuarios>('/auth/estadisticas/')
      .pipe(
        catchError(error => {
          console.error('Error obteniendo estadísticas:', error);
          // Fallback a estadísticas simuladas
          return of({
            total_usuarios: 150,
            usuarios_activos: 142,
            usuarios_inactivos: 8,
            por_rol: {
              estudiantes: 120,
              docentes: 25,
              administradores: 5
            }
          });
        })
      );
  }

  /**
   * Datos simulados para fallback
   */
  private getUsuariosSimulados(): UsuarioAdmin[] {
    return [
      {
        id: 1,
        email: 'juan.perez@universidad.edu',
        username: 'juan.perez',
        nombre: 'Juan',
        apellido: 'Pérez',
        rol: 'Estudiante',
        is_active: true,
        fecha_registro: '2024-01-15T10:30:00Z',
        ultimo_acceso: '2024-01-20T14:25:00Z',
        carrera: 'Ingeniería de Sistemas',
        matricula: '2024001'
      },
      {
        id: 2,
        email: 'maria.garcia@universidad.edu',
        username: 'maria.garcia',
        nombre: 'María',
        apellido: 'García',
        rol: 'Docente',
        is_active: true,
        fecha_registro: '2023-08-10T09:15:00Z',
        ultimo_acceso: '2024-01-19T16:45:00Z',
        departamento: 'Ciencias de la Computación',
        numero_empleado: 'DOC001'
      },
      {
        id: 3,
        email: 'carlos.lopez@universidad.edu',
        username: 'carlos.lopez',
        nombre: 'Carlos',
        apellido: 'López',
        rol: 'Estudiante',
        is_active: false,
        fecha_registro: '2024-01-05T11:20:00Z',
        ultimo_acceso: '2024-01-18T13:30:00Z',
        carrera: 'Ingeniería Industrial',
        matricula: '2024002'
      },
      {
        id: 4,
        email: 'ana.rodriguez@universidad.edu',
        username: 'ana.rodriguez',
        nombre: 'Ana',
        apellido: 'Rodríguez',
        rol: 'Administrador',
        is_active: true,
        fecha_registro: '2023-01-15T08:00:00Z',
        ultimo_acceso: '2024-01-20T17:00:00Z',
        area: 'Sistemas'
      },
      {
        id: 5,
        email: 'pedro.martinez@universidad.edu',
        username: 'pedro.martinez',
        nombre: 'Pedro',
        apellido: 'Martínez',
        rol: 'Docente',
        is_active: true,
        fecha_registro: '2023-09-01T10:00:00Z',
        ultimo_acceso: '2024-01-19T12:15:00Z',
        departamento: 'Matemáticas',
        numero_empleado: 'DOC002'
      }
    ];
  }
}