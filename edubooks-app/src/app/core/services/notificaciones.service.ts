import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastController, AlertController } from '@ionic/angular';
import { ApiService } from './api.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Notificacion {
  id: number;
  tipo: 'prestamo' | 'devolucion' | 'sancion' | 'general';
  titulo: string;
  mensaje: string;
  fecha_creacion: string;
  leida: boolean;
  relacionado_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();
  
  private notificaciones: Notificacion[] = [];

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private apiService: ApiService
  ) {
    this.cargarNotificaciones();
  }

  /**
   * Cargar notificaciones desde el backend
   */
  cargarNotificaciones(): Observable<Notificacion[]> {
    return this.apiService.get('/notificaciones/').pipe(
      map((response: any) => {
        const notificaciones = response.results || response || [];
        this.notificaciones = Array.isArray(notificaciones) ? notificaciones : [];
        this.notificacionesSubject.next([...this.notificaciones]);
        return this.notificaciones;
      }),
      catchError(error => {
        console.error('Error cargando notificaciones:', error);
        this.notificaciones = [];
        this.notificacionesSubject.next([]);
        return of([]);
      })
    );
  }

  /**
   * Marcar notificación como leída
   */
  marcarComoLeida(id: number): Observable<any> {
    return this.apiService.post(`/notificaciones/${id}/marcar-leida/`, {}).pipe(
      map(response => {
        // Actualizar estado local
        const notificacion = this.notificaciones.find(n => n.id === id);
        if (notificacion) {
          notificacion.leida = true;
          this.notificacionesSubject.next([...this.notificaciones]);
        }
        return response;
      }),
      catchError(error => {
        console.error('Error marcando notificación como leída:', error);
        return of(null);
      })
    );
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasComoLeidas(): Observable<any> {
    return this.apiService.post('/notificaciones/marcar-todas-leidas/', {}).pipe(
      map(response => {
        // Actualizar estado local
        this.notificaciones.forEach(n => n.leida = true);
        this.notificacionesSubject.next([...this.notificaciones]);
        return response;
      }),
      catchError(error => {
        console.error('Error marcando todas las notificaciones como leídas:', error);
        return of(null);
      })
    );
  }

  /**
   * Eliminar notificación (TODO: implementar en backend)
   */
  eliminarNotificacion(id: number) {
    // TODO: Implementar endpoint en backend
    console.log('Eliminar notificación:', id);
  }

  /**
   * Limpiar todas las notificaciones (TODO: implementar en backend)
   */
  limpiarNotificaciones() {
    // TODO: Implementar endpoint en backend
    console.log('Limpiar todas las notificaciones');
  }

  /**
   * Obtener cantidad de notificaciones no leídas
   */
  getNotificacionesNoLeidas(): Observable<number> {
    return new Observable(observer => {
      this.notificaciones$.subscribe(notificaciones => {
        const notificacionesArray = Array.isArray(notificaciones) ? notificaciones : [];
        const noLeidas = notificacionesArray.filter(n => n && !n.leida).length;
        observer.next(noLeidas);
      });
    });
  }

  /**
   * Métodos de notificación específicos (TODO: implementar con backend)
   */
  notificarLibroDisponible(tituloLibro: string) {
    console.log(`Libro disponible: ${tituloLibro}`);
    // TODO: Las notificaciones se crean desde el backend
  }

  notificarPrestamoVencido(tituloLibro: string, diasRetraso: number) {
    console.log(`Préstamo vencido: ${tituloLibro}, ${diasRetraso} días`);
    // TODO: Las notificaciones se crean desde el backend
  }

  notificarSancionAplicada(monto: number) {
    console.log(`Sanción aplicada: $${monto}`);
    // TODO: Las notificaciones se crean desde el backend
  }

  notificarReservaExpirada(tituloLibro: string) {
    console.log(`Reserva expirada: ${tituloLibro}`);
    // TODO: Las notificaciones se crean desde el backend
  }

  notificarNuevaBibliografia(curso: string, programa: string) {
    console.log(`Nueva bibliografía: ${curso} en ${programa}`);
    // TODO: Las notificaciones se crean desde el backend
  }

  /**
   * Mostrar toast
   */
  private async mostrarToast(mensaje: string, tipo: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: tipo === 'error' ? 'danger' : tipo,
      position: 'top',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Generar notificaciones de prueba (para desarrollo)
   */
  generarNotificacionesPrueba() {
    console.log('Generar notificaciones de prueba');
    // TODO: Implementar con datos del backend
  }
}