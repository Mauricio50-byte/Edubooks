import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Sancion } from '../models/libro.model';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SancionService {
  private sancionesSubject = new BehaviorSubject<Sancion[]>([]);
  public sanciones$ = this.sancionesSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  /**
   * Obtener sanciones del usuario actual
   */
  obtenerSancionesUsuario(): Observable<Sancion[]> {
    return this.apiService.get('/sanciones/').pipe(
      map((response: any) => {
        const sanciones = response.results || response;
        this.sancionesSubject.next(sanciones);
        return sanciones;
      }),
      catchError(error => {
        console.error('Error obteniendo sanciones:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener todas las sanciones (solo administradores)
   */
  obtenerTodasLasSanciones(): Observable<Sancion[]> {
    return this.apiService.get('/sanciones/').pipe(
      map((response: any) => response.results || response),
      catchError(error => {
        console.error('Error obteniendo todas las sanciones:', error);
        throw error;
      })
    );
  }

  /**
   * Pagar una multa
   */
  pagarMulta(sancionId: number): Observable<any> {
    return this.apiService.post(`/sanciones/${sancionId}/pagar/`, {}).pipe(
      map(response => {
        // Actualizar la sanción en el estado local
        const sancionesActuales = this.sancionesSubject.value;
        const sancionIndex = sancionesActuales.findIndex(s => s.id === sancionId);
        if (sancionIndex !== -1) {
          sancionesActuales[sancionIndex].estado = 'Pagada';
          sancionesActuales[sancionIndex].fecha_fin = new Date().toISOString();
          this.sancionesSubject.next([...sancionesActuales]);
        }
        return response;
      }),
      catchError(error => {
        console.error('Error pagando multa:', error);
        throw error;
      })
    );
  }

  /**
   * Crear nueva sanción (solo administradores)
   */
  crearSancion(sancionData: any): Observable<Sancion> {
    return this.apiService.post('/sanciones/crear/', sancionData).pipe(
      map((response: any) => {
        const nuevaSancion = response.data || response;
        const sancionesActuales = this.sancionesSubject.value;
        this.sancionesSubject.next([nuevaSancion, ...sancionesActuales]);
        return nuevaSancion;
      }),
      catchError(error => {
        console.error('Error creando sanción:', error);
        throw error;
      })
    );
  }

  /**
   * Aprobar sanción (solo administradores)
   */
  aprobarSancion(sancionId: number): Observable<any> {
    return this.apiService.post(`/sanciones/${sancionId}/aprobar/`, {}).pipe(
      catchError(error => {
        console.error('Error aprobando sanción:', error);
        throw error;
      })
    );
  }

  /**
   * Rechazar sanción (solo administradores)
   */
  rechazarSancion(sancionId: number): Observable<any> {
    return this.apiService.post(`/sanciones/${sancionId}/rechazar/`, {}).pipe(
      catchError(error => {
        console.error('Error rechazando sanción:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener estadísticas de sanciones (solo administradores)
   */
  obtenerEstadisticasSanciones(): Observable<any> {
    return this.apiService.get('/dashboard-sanciones/').pipe(
      catchError(error => {
        console.error('Error obteniendo estadísticas:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener sanciones pendientes (solo administradores)
   */
  obtenerSancionesPendientes(): Observable<Sancion[]> {
    return this.apiService.get('/sanciones-pendientes/').pipe(
      map((response: any) => response.results || response),
      catchError(error => {
        console.error('Error obteniendo sanciones pendientes:', error);
        throw error;
      })
    );
  }



  /**
   * Limpiar estado local
   */
  limpiarEstado(): void {
    this.sancionesSubject.next([]);
  }
}