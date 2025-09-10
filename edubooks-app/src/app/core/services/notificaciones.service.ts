import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastController, AlertController } from '@ionic/angular';

export interface Notificacion {
  id: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  accion?: {
    texto: string;
    callback: () => void;
  };
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
    private alertController: AlertController
  ) {
    this.cargarNotificacionesLocales();
  }

  /**
   * Agregar nueva notificación
   */
  agregarNotificacion(notificacion: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) {
    const nuevaNotificacion: Notificacion = {
      ...notificacion,
      id: this.generarId(),
      fecha: new Date(),
      leida: false
    };

    this.notificaciones.unshift(nuevaNotificacion);
    this.notificacionesSubject.next([...this.notificaciones]);
    this.guardarNotificacionesLocales();

    // Mostrar toast para notificaciones importantes
    if (notificacion.tipo === 'warning' || notificacion.tipo === 'error') {
      this.mostrarToast(notificacion.titulo, notificacion.tipo);
    }
  }

  /**
   * Marcar notificación como leída
   */
  marcarComoLeida(id: string) {
    const notificacion = this.notificaciones.find(n => n.id === id);
    if (notificacion) {
      notificacion.leida = true;
      this.notificacionesSubject.next([...this.notificaciones]);
      this.guardarNotificacionesLocales();
    }
  }

  /**
   * Marcar todas como leídas
   */
  marcarTodasComoLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
    this.notificacionesSubject.next([...this.notificaciones]);
    this.guardarNotificacionesLocales();
  }

  /**
   * Eliminar notificación
   */
  eliminarNotificacion(id: string) {
    this.notificaciones = this.notificaciones.filter(n => n.id !== id);
    this.notificacionesSubject.next([...this.notificaciones]);
    this.guardarNotificacionesLocales();
  }

  /**
   * Limpiar todas las notificaciones
   */
  limpiarNotificaciones() {
    this.notificaciones = [];
    this.notificacionesSubject.next([]);
    this.guardarNotificacionesLocales();
  }

  /**
   * Obtener cantidad de notificaciones no leídas
   */
  getNotificacionesNoLeidas(): Observable<number> {
    return new Observable(observer => {
      this.notificaciones$.subscribe(notificaciones => {
        const noLeidas = notificaciones.filter(n => !n.leida).length;
        observer.next(noLeidas);
      });
    });
  }

  /**
   * Notificaciones específicas del sistema de biblioteca
   */
  notificarLibroDisponible(tituloLibro: string) {
    this.agregarNotificacion({
      tipo: 'success',
      titulo: 'Libro Disponible',
      mensaje: `El libro "${tituloLibro}" ya está disponible para préstamo.`,
      accion: {
        texto: 'Ver Catálogo',
        callback: () => {
          // TODO: Navegar al catálogo
          console.log('Navegar al catálogo');
        }
      }
    });
  }

  notificarPrestamoVencido(tituloLibro: string, diasRetraso: number) {
    this.agregarNotificacion({
      tipo: 'error',
      titulo: 'Préstamo Vencido',
      mensaje: `El libro "${tituloLibro}" tiene ${diasRetraso} días de retraso. Devuélvelo para evitar sanciones.`,
      accion: {
        texto: 'Ver Historial',
        callback: () => {
          // TODO: Navegar al historial
          console.log('Navegar al historial');
        }
      }
    });
  }

  notificarSancionAplicada(monto: number) {
    this.agregarNotificacion({
      tipo: 'warning',
      titulo: 'Sanción Aplicada',
      mensaje: `Se ha aplicado una multa de $${monto.toLocaleString()} por devolución tardía.`,
      accion: {
        texto: 'Ver Sanciones',
        callback: () => {
          // TODO: Navegar a sanciones
          console.log('Navegar a sanciones');
        }
      }
    });
  }

  notificarReservaExpirada(tituloLibro: string) {
    this.agregarNotificacion({
      tipo: 'warning',
      titulo: 'Reserva Expirada',
      mensaje: `Tu reserva para "${tituloLibro}" ha expirado.`
    });
  }

  notificarNuevaBibliografia(curso: string, programa: string) {
    this.agregarNotificacion({
      tipo: 'info',
      titulo: 'Nueva Bibliografía',
      mensaje: `Se ha agregado una nueva bibliografía para el curso "${curso}" en ${programa}.`,
      accion: {
        texto: 'Ver Bibliografías',
        callback: () => {
          // TODO: Navegar a bibliografías
          console.log('Navegar a bibliografías');
        }
      }
    });
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
   * Generar ID único
   */
  private generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Guardar notificaciones en localStorage
   */
  private guardarNotificacionesLocales() {
    try {
      localStorage.setItem('edubooks_notificaciones', JSON.stringify(this.notificaciones));
    } catch (error) {
      console.error('Error guardando notificaciones:', error);
    }
  }

  /**
   * Cargar notificaciones desde localStorage
   */
  private cargarNotificacionesLocales() {
    try {
      const notificacionesGuardadas = localStorage.getItem('edubooks_notificaciones');
      if (notificacionesGuardadas) {
        this.notificaciones = JSON.parse(notificacionesGuardadas).map((n: any) => ({
          ...n,
          fecha: new Date(n.fecha)
        }));
        this.notificacionesSubject.next([...this.notificaciones]);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      this.notificaciones = [];
    }
  }

  /**
   * Simular notificaciones de prueba (para desarrollo)
   */
  generarNotificacionesPrueba() {
    this.notificarLibroDisponible('El Quijote de la Mancha');
    this.notificarPrestamoVencido('Cien años de soledad', 3);
    this.notificarSancionAplicada(15000);
    this.notificarNuevaBibliografia('Programación Avanzada', 'Ingeniería de Sistemas');
  }
}